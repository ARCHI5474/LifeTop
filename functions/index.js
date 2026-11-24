import {initializeApp} from 'firebase-admin/app';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {createMessagesService,DAY} from './messages-service.js?v=14.0.0';
import {createLiveService} from './live-service.js?v=14.0.0';
initializeApp();const db=getFirestore(),service=createMessagesService(db,Timestamp);
const liveService=createLiveService(db);
// Only the Firebase local emulator skips App Check; deployed functions always enforce it.
const enforceAppCheck=process.env.FUNCTIONS_EMULATOR!=='true';
export const liveCommand=onCall({region:'asia-northeast1',enforceAppCheck,maxInstances:3,timeoutSeconds:30},async request=>{
 if(!request.auth||request.auth.token.firebase?.sign_in_provider!=='google.com')throw new HttpsError('unauthenticated','Google認証が必要です。');
 try{return await liveService(request.auth.uid,request.data);}catch(e){throw new HttpsError('failed-precondition',e.message||'Liveに接続できませんでした。');}
});
export const messagesCommand=onCall({region:'asia-northeast1',enforceAppCheck,maxInstances:3,timeoutSeconds:30},async request=>{
 if(!request.auth||request.auth.token.firebase?.sign_in_provider!=='google.com')throw new HttpsError('unauthenticated','Google認証が必要です。');
 try{return await service(request.auth.uid,request.data);}catch(e){if(e.code==='resource-exhausted')throw new HttpsError('resource-exhausted','少し待って再試行してください。');throw new HttpsError('failed-precondition',e.message||'操作できませんでした。');}
});
export const cleanupMessages=onSchedule({schedule:'every 24 hours',region:'asia-northeast1',maxInstances:1,timeoutSeconds:540},async()=>{
 const rooms=await db.collection('messageRooms').where('lastUsedAtMs','<',Date.now()-90*DAY).limit(100).get();
 for(const snapshot of rooms.docs){const removed=await db.runTransaction(async tx=>{const current=await tx.get(snapshot.ref);if(!current.exists||current.data().lastUsedAtMs>=Date.now()-90*DAY)return null;tx.update(snapshot.ref,{deleted:true,members:[]});tx.delete(db.collection('messageInvites').doc(current.data().inviteHash));return current.data().members;});if(!removed)continue;for(const uid of removed){const ref=db.collection('messageAccounts').doc(uid);await db.runTransaction(async tx=>{const a=await tx.get(ref);if(a.exists)tx.update(ref,{roomIds:a.data().roomIds.filter(id=>id!==snapshot.id)});});}await db.recursiveDelete(snapshot.ref);}
 // TTL should also be enabled on messages.expiresAt. This bounded fallback removes expired history.
 const expired=await db.collectionGroup('messages').where('expiresAt','<=',Timestamp.now()).limit(400).get();const batch=db.batch();for(const message of expired.docs)if(message.ref.parent.parent?.parent.id==='messageRooms')batch.delete(message.ref);if(!expired.empty)await batch.commit();
});
