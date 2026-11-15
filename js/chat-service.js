export const CHAT_DAY = 86400000;
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const text = (value, max) => { if (typeof value !== 'string' || !value.trim() || value.length > max) throw Error('入力内容を確認してください。'); return value.trim(); };
export function inviteToken() { return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); }
export async function inviteHash(token) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(value => value.toString(16).padStart(2,'0')).join(''); }

// Transactions express intent; Firestore Rules independently authorize every field and coupled write.
export function createChatService(db, auth, fs) {
    let offset = 0;
    const now = () => Date.now() + offset;
    const roomRef = id => fs.doc(db,'chatRooms',id), inviteRef = hash => fs.doc(db,'chatInvites',hash);
    const user = () => { if (!auth.currentUser || auth.currentUser.isAnonymous) throw Error('Googleでログインしてください。'); return auth.currentUser; };
    function accountData(account, op, roomId, ids, messageId = '') {
        const reset = !account?.windowStart || now() - account.windowStart.toMillis() >= CHAT_DAY;
        return {roomIds:ids,op,lastRoomId:roomId,lastMessageId:messageId,at:fs.serverTimestamp(),windowStart:reset ? fs.serverTimestamp() : account.windowStart,createdCount:op==='create' ? (reset?1:account.createdCount+1) : (reset ? 0 : account?.createdCount || 0)};
    }
    async function calibrate() {
        const ref = fs.doc(db,'chatProfiles',user().uid), start = Date.now();
        await fs.setDoc(ref,{at:fs.serverTimestamp()});
        const value = await fs.getDocFromServer(ref);
        offset = value.data().at.toMillis() - (start+Date.now())/2;
    }
    async function command(op, input = {}) {
        const current = user(), uid = current.uid, ar = fs.doc(db,'chatAccounts',uid);
        if (op === 'list') {
            const a = await fs.getDocFromServer(ar), rooms = []; let nextPrune=0;
            for (const id of a.data()?.roomIds || []) {
                try { const s = await fs.getDocFromServer(roomRef(id)); if (s.exists() && !s.data().deleted) { rooms.push({id,...s.data()}); continue; } } catch (error) { if (error.code !== 'permission-denied') throw error; }
                if(nextPrune>Date.now())await new Promise(resolve=>setTimeout(resolve,nextPrune-Date.now()));
                await fs.runTransaction(db,async tx => { const before = await tx.get(ar); tx.set(ar,accountData(before.data(),'prune',id,before.data().roomIds.filter(value=>value!==id))); });
                nextPrune=Date.now()+1100;
            }
            return {rooms};
        }
        if (op === 'create') {
            const token = inviteToken(), hash = await inviteHash(token), id = crypto.randomUUID(), ref = roomRef(id), name = text(input.name,80);
            await fs.runTransaction(db,async tx => {
                const a = await tx.get(ar), account = a.data(), ids = account?.roomIds || [];
                if (ids.length >= 10) throw Error('参加できるルームは10室までです。');
                const data = accountData(account,'create',id,[...ids,id]); if (data.createdCount>3) throw Error('ルーム作成は24時間に3室までです。');
                tx.set(ref,{schema:2,name,owner:uid,members:[uid],inviteHash:hash,createdAt:fs.serverTimestamp(),updatedAt:fs.serverTimestamp(),deleted:false,messageCount:0});
                tx.set(inviteRef(hash),{roomId:id,members:[uid]}); tx.set(ar,data);
            }); return {roomId:id,token};
        }
        if (op === 'join') {
            if (!/^[a-zA-Z0-9_-]{43}$/.test(input.token || '')) throw Error('招待リンクが無効です。');
            const hash = await inviteHash(input.token);
            return fs.runTransaction(db,async tx => {
                const inv = await tx.get(inviteRef(hash)), a = await tx.get(ar); if (!inv.exists()) throw Error('招待リンクが無効です。');
                const {roomId,members} = inv.data(), account = a.data(), ids = account?.roomIds || [];
                if (members.includes(uid)) return {roomId};
                if (members.length>=20 || ids.length>=10) throw Error('ルームの参加上限です。');
                const next = [...members,uid];
                tx.update(roomRef(roomId),{members:next,updatedAt:fs.serverTimestamp()}); tx.update(inv.ref,{members:next});
                tx.set(ar,accountData(account,'join',roomId,[...ids,roomId])); return {roomId};
            });
        }
        if (!validId(input.roomId)) throw Error('ルームを選択してください。');
        const ref = roomRef(input.roomId);
        return fs.runTransaction(db,async tx => {
            const a = await tx.get(ar), s = await tx.get(ref), room = s.data(), account = a.data();
            if (!room || room.deleted || !room.members.includes(uid)) throw Error('ルームにアクセスできません。');
            const ids = account?.roomIds || [], stamp = (idsAfter=ids) => accountData(account,op,ref.id,idsAfter,input.requestId || input.messageId || '');
            if (op === 'send') {
                const body = text(input.body,2000); if (!validId(input.requestId)) throw Error('送信IDが不正です。');
                const mr = fs.doc(db,'chatRooms',ref.id,'messages',input.requestId), existing = await tx.get(mr);
                if (existing.exists()) { if (existing.data().sender!==uid) throw Error('送信IDが重複しています。'); return {messageId:mr.id}; }
                if (room.messageCount>=10000) throw Error('ルームの履歴上限です。新しいルームを作成してください。');
                tx.set(mr,{body,sender:uid,nickname:current.displayName || 'ユーザー',createdAt:fs.serverTimestamp()});
                tx.update(ref,{messageCount:room.messageCount+1,updatedAt:fs.serverTimestamp()}); tx.set(ar,stamp()); return {messageId:mr.id};
            }
            if (op === 'deleteMessage') {
                if (!validId(input.messageId)) throw Error('メッセージIDが不正です。');
                const mr = fs.doc(db,'chatRooms',ref.id,'messages',input.messageId), message = await tx.get(mr);
                if (!message.exists() || message.data().sender!==uid) throw Error('自分のメッセージだけ削除できます。');
                tx.delete(mr); tx.set(ar,stamp()); return {};
            }
            if (op === 'leave') {
                const members = room.members.filter(id=>id!==uid);
                tx.update(ref,{members,owner:room.owner===uid?(members[0]||uid):room.owner,deleted:!members.length,updatedAt:fs.serverTimestamp()});
                if (members.length) tx.update(inviteRef(room.inviteHash),{members}); else tx.delete(inviteRef(room.inviteHash));
                tx.delete(fs.doc(db,'chatRooms',ref.id,'presence',uid)); tx.set(ar,stamp(ids.filter(id=>id!==ref.id))); return {};
            }
            if (room.owner!==uid) throw Error('管理者だけが操作できます。');
            if (op === 'rotate') {
                const token = input.newToken, hash = input.newHash;
                tx.update(ref,{inviteHash:hash,updatedAt:fs.serverTimestamp()}); tx.delete(inviteRef(room.inviteHash)); tx.set(inviteRef(hash),{roomId:ref.id,members:room.members}); tx.set(ar,stamp()); return {token};
            }
            if (op === 'deleteRoom') {
                tx.update(ref,{deleted:true,members:[],updatedAt:fs.serverTimestamp()}); tx.delete(inviteRef(room.inviteHash)); tx.set(ar,stamp(ids.filter(id=>id!==ref.id))); return {};
            }
            throw Error('対応していない操作です。');
        });
    }
    async function execute(op,input={}) {
        if (op==='rotate') { const newToken=inviteToken(); input={...input,newToken,newHash:await inviteHash(newToken)}; }
        return command(op,input);
    }
    async function presence(roomId,sessionId,offline=false,ripple) {
        const uid = user().uid, ref = fs.doc(db,'chatRooms',roomId,'presence',uid);
        await fs.runTransaction(db,async tx => {
            const s=await tx.get(ref), before=s.data(), sessions=Object.fromEntries(Object.entries(before?.sessions||{}).filter(([,stamp])=>stamp.toMillis()>now()-80000));
            if (offline) delete sessions[sessionId]; else sessions[sessionId]=fs.serverTimestamp();
            if (Object.keys(sessions).length>5) throw Error('Liveは同時に5画面までです。');
            if (!Object.keys(sessions).length) { if(s.exists())tx.delete(ref); return; }
            const data={sessions,sessionId,nickname:user().displayName||'ユーザー',updatedAt:fs.serverTimestamp()};
            if (ripple) data.ripple={...ripple,at:fs.serverTimestamp(),id:crypto.randomUUID()};
            else if(before?.ripple) data.ripple=before.ripple;
            tx.set(ref,data);
        });
    }
    return {command:execute,calibrate,presence,now,roomRef,historyQuery: id=>fs.query(fs.collection(db,'chatRooms',id,'messages'),fs.where('createdAt','>',fs.Timestamp.fromMillis(now()-90*CHAT_DAY+60000)),fs.orderBy('createdAt','desc'),fs.limit(100))};
}
