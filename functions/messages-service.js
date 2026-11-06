import {randomBytes,createHash} from 'node:crypto';
export const DAY=86400000,MAX_MEMBERS=20,MAX_ROOMS=10;
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export function text(value,max,label){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(label+'を確認してください。');return value.trim();}
export function assertMember(room,uid,now){if(!room||room.deleted||room.lastUsedAtMs<now-90*DAY||!room.members?.includes(uid))throw Error('ルームへのアクセス権限がありません。');}
export function assertJoin(room,uid,now){if(!room||room.deleted||room.lastUsedAtMs<now-90*DAY)throw Error('招待は無効です。');if(!room.members.includes(uid)&&room.members.length>=MAX_MEMBERS)throw Error('ルームは20人までです。');}
// All writes are server-only. Transactions serialize membership and rate limits.
export function createMessagesService(db,Timestamp){
 const roomRef=id=>db.collection('messageRooms').doc(id),accountRef=uid=>db.collection('messageAccounts').doc(uid),inviteRef=hash=>db.collection('messageInvites').doc(hash);
 return async function command(uid,input,now=Date.now()){
  const op=input?.op;if(!['create','join','list','send','leave','deleteRoom','rotate','deleteMessage'].includes(op))throw Error('対応していない操作です。');
  const nickname=['create','join','send'].includes(op)?text(input.nickname,40,'ニックネーム'):'';
  const roomId=['create','join','list'].includes(op)?'':text(input.roomId,80,'ルームID');if(roomId&&!/^[a-zA-Z0-9_-]+$/.test(roomId))throw Error('ルームIDが不正です。');
  const token=['create','rotate'].includes(op)?randomBytes(32).toString('base64url'):op==='join'?text(input.token,80,'招待トークン'):null;
  if(op==='join'&&!/^[a-zA-Z0-9_-]{43}$/.test(token))throw Error('招待は無効です。');
  const generated=op==='create'?roomRef(randomBytes(16).toString('hex')):null,ar=accountRef(uid),budgetRef=db.collection('messageBudgets').doc(new Date(now).toISOString().slice(0,10));
  const result=await db.runTransaction(async tx=>{
   const as=await tx.get(ar),account=as.exists?as.data():{roomIds:[],lastCommandAt:0,lastSentAt:0,createdDay:'',createdCount:0};
   if(now-account.lastCommandAt<500)throw Error('操作が速すぎます。少し待ってください。');
   const finish=extra=>tx.set(ar,{...account,lastCommandAt:now,...extra});
   if(op==='list'){
    const rooms=[];for(const id of account.roomIds.slice(0,MAX_ROOMS)){const rs=await tx.get(roomRef(id));if(!rs.exists)continue;const r=rs.data();if(!r.deleted&&r.members.includes(uid)&&r.lastUsedAtMs>=now-90*DAY)rooms.push({id,name:r.name,owner:r.owner,members:r.members.length});}
    finish({roomIds:rooms.map(r=>r.id)});return {rooms};
   }
   if(op==='create'){
    const name=text(input.name,80,'ルーム名'),date=new Date(now).toISOString().slice(0,10),count=account.createdDay===date?account.createdCount:0;
    if(account.roomIds.length>=MAX_ROOMS||count>=3)throw Error('ルーム作成の上限です（参加10室・作成1日3室）。');
    const bs=await tx.get(budgetRef),budget=bs.exists?bs.data():{rooms:0,messages:0};if(budget.rooms>=100)throw Error('本日のルーム作成上限です。');
    const hash=tokenHash(token),room={name,owner:uid,members:[uid],nicknames:{[uid]:nickname},inviteHash:hash,createdAt:Timestamp.fromMillis(now),lastUsedAtMs:now,deleted:false,messageCount:0};
    tx.create(generated,room);tx.create(inviteRef(hash),{roomId:generated.id});tx.set(budgetRef,{...budget,rooms:budget.rooms+1});finish({roomIds:[...account.roomIds,generated.id],createdDay:date,createdCount:count+1});return {roomId:generated.id,token};
   }
   if(op==='join'){
    const hash=tokenHash(token),inv=await tx.get(inviteRef(hash));if(!inv.exists)throw Error('招待は無効です。');const ref=roomRef(inv.data().roomId),rs=await tx.get(ref),room=rs.exists?rs.data():null;assertJoin(room,uid,now);if(room.inviteHash!==hash)throw Error('招待は無効です。');if(!account.roomIds.includes(ref.id)&&account.roomIds.length>=MAX_ROOMS)throw Error('参加は10室までです。');
    tx.update(ref,{members:[...new Set([...room.members,uid])],nicknames:{...room.nicknames,[uid]:nickname},lastUsedAtMs:now});finish({roomIds:[...new Set([...account.roomIds,ref.id])]});return {roomId:ref.id};
   }
   const ref=roomRef(roomId),rs=await tx.get(ref),room=rs.exists?rs.data():null;assertMember(room,uid,now);
   if(op==='send'){
    const body=text(input.body,2000,'メッセージ'),requestId=text(input.requestId,80,'送信ID');if(!/^[a-zA-Z0-9_-]+$/.test(requestId))throw Error('送信IDが不正です。');
    const messageRef=ref.collection('messages').doc(requestId),existing=await tx.get(messageRef);if(existing.exists){if(existing.data().sender!==uid)throw Error('送信IDが重複しています。');return {messageId:requestId};}
    if(now-account.lastSentAt<1000||room.messageCount>=10000)throw Error('送信上限です（毎秒1件・ルーム10000件）。');const bs=await tx.get(budgetRef),budget=bs.exists?bs.data():{rooms:0,messages:0};if(budget.messages>=20000)throw Error('本日の送信上限です。');
    tx.create(messageRef,{sender:uid,nickname,body,createdAt:Timestamp.fromMillis(now),expiresAt:Timestamp.fromMillis(now+90*DAY)});tx.update(ref,{lastUsedAtMs:now,messageCount:room.messageCount+1});tx.set(budgetRef,{...budget,messages:budget.messages+1});finish({lastSentAt:now});return {messageId:requestId};
   }
   if(op==='deleteMessage'){
    const messageId=text(input.messageId,80,'メッセージID');if(!/^[a-zA-Z0-9_-]+$/.test(messageId))throw Error('メッセージIDが不正です。');const mr=ref.collection('messages').doc(messageId),ms=await tx.get(mr);if(!ms.exists||ms.data().sender!==uid)throw Error('自分のメッセージだけ削除できます。');tx.delete(mr);finish({});return {};
   }
   if(op==='leave'){const members=room.members.filter(x=>x!==uid),nicknames={...room.nicknames};delete nicknames[uid];tx.update(ref,{members,nicknames,owner:room.owner===uid?(members[0]||''):room.owner,deleted:!members.length,lastUsedAtMs:members.length?now:0});if(!members.length)tx.delete(inviteRef(room.inviteHash));finish({roomIds:account.roomIds.filter(x=>x!==roomId)});return {};}
   if(room.owner!==uid)throw Error('管理者だけが実行できます。');
   if(op==='rotate'){const hash=tokenHash(token);tx.delete(inviteRef(room.inviteHash));tx.create(inviteRef(hash),{roomId});tx.update(ref,{inviteHash:hash,lastUsedAtMs:now});finish({});return {roomId,token};}
   if(op==='deleteRoom'){tx.update(ref,{deleted:true,members:[],lastUsedAtMs:0});tx.delete(inviteRef(room.inviteHash));finish({roomIds:account.roomIds.filter(x=>x!==roomId)});return {};}
  });
  return result;
 };
}
