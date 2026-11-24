import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInWithCredential,GoogleAuthProvider,signInAnonymously} from 'firebase/auth';
import * as fs from 'firebase/firestore';
import {createChatService} from '../../js/chat-service.js?v=14.0.0';
if(!process.env.FIRESTORE_EMULATOR_HOST||process.env.GCLOUD_PROJECT!=='demo-lifetop')throw Error('Emulator only.');
const clients=[],pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function client(name,anonymous=false){
 const app=initializeApp({projectId:'demo-lifetop',apiKey:'demo-key',appId:'demo-chat'},name),auth=getAuth(app),db=fs.getFirestore(app);
 connectAuthEmulator(auth,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});const[host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');fs.connectFirestoreEmulator(db,host,Number(port));
 if(anonymous)await signInAnonymously(auth);else{
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const token=encode({alg:'none',typ:'JWT'})+'.'+encode({sub:'google-'+name,email:name.toLowerCase()+'@example.test',email_verified:true,name,aud:'demo-client'})+'.';
  await signInWithCredential(auth,GoogleAuthProvider.credential(token));
 }
 const service=createChatService(db,auth,fs);let next=0;
 const c={app,auth,db,service,async command(op,data={}){await pause(Math.max(0,next-Date.now()));next=Date.now()+1250;return service.command(op,data);}};clients.push(c);return c;
}
const denied=async promise=>assert.rejects(promise,error=>error.code==='permission-denied');
function watch(ref,predicate){return new Promise((resolve,reject)=>{let off;const timer=setTimeout(()=>{off?.();reject(Error('snapshot timeout'));},12000);off=fs.onSnapshot(ref,s=>{if(predicate(s)){clearTimeout(timer);off?.();resolve(s);}},error=>{clearTimeout(timer);reject(error);});});}
try{
 const alice=await client('Alice'),bob=await client('Bob'),outsider=await client('Outsider'),anon=await client('Anon',true);
 await alice.service.calibrate();await bob.service.calibrate();await outsider.service.calibrate();
 await assert.rejects(anon.service.calibrate(),/Google/);await denied(fs.setDoc(fs.doc(anon.db,'chatProfiles',anon.auth.currentUser.uid),{at:fs.serverTimestamp()}));
 const room=await alice.command('create',{name:'Google-only room'}),id=room.roomId;
 await denied(fs.getDoc(fs.doc(outsider.db,'chatRooms',id)));await denied(fs.getDoc(fs.doc(anon.db,'chatRooms',id)));
 await bob.command('join',{token:room.token});assert.equal((await fs.getDoc(fs.doc(bob.db,'chatRooms',id))).data().members.length,2);
 await denied(fs.setDoc(fs.doc(bob.db,'chatRooms',id,'messages','forged'),{body:'bad',sender:alice.auth.currentUser.uid,nickname:'Alice',createdAt:fs.serverTimestamp()}));
 await alice.command('send',{roomId:id,body:'<b>plain text</b>',requestId:'message-1'});
 const history=bob.service.historyQuery(id);assert.equal((await fs.getDocs(history)).size,1);
 await alice.command('send',{roomId:id,body:'<b>plain text</b>',requestId:'message-1'});assert.equal((await fs.getDocs(history)).size,1);
 const fake=createChatService(bob.db,{currentUser:{uid:bob.auth.currentUser.uid,isAnonymous:false,displayName:'Alice'}},fs);
 await pause(1300);await denied(fake.command('send',{roomId:id,body:'forged name',requestId:'forged-name'}));
 await assert.rejects(bob.command('deleteMessage',{roomId:id,messageId:'message-1'}));
 await alice.command('deleteMessage',{roomId:id,messageId:'message-1'});assert.equal((await fs.getDocs(history)).size,0);
 const liveQuery=fs.query(fs.collection(bob.db,'chatRooms',id,'presence'),fs.orderBy('updatedAt','desc'),fs.limit(20));
 const presence=watch(liveQuery,s=>s.docs.some(doc=>doc.id===alice.auth.currentUser.uid));
 await alice.service.presence(id,'session-alice-first');await presence;
 await pause(1200);await alice.service.presence(id,'session-alice-second');await pause(1200);await alice.service.presence(id,'session-alice-first',true);
 const p=await fs.getDoc(fs.doc(bob.db,'chatRooms',id,'presence',alice.auth.currentUser.uid));assert.ok(p.data().sessions['session-alice-second']);
 await pause(1200);const wave=watch(liveQuery,s=>s.docs.some(doc=>doc.data().ripple?.x===.25));await alice.service.presence(id,'session-alice-second',false,{x:.25,y:.75});await wave;
 await denied(fs.setDoc(fs.doc(bob.db,'chatRooms',id,'presence',alice.auth.currentUser.uid),{sessions:{},sessionId:'session-spoofed-other',nickname:'Bob',updatedAt:fs.serverTimestamp()}));
 const rotated=await alice.command('rotate',{roomId:id});await assert.rejects(outsider.command('join',{token:room.token}));
 await outsider.command('join',{token:rotated.token});
 await outsider.command('leave',{roomId:id});await denied(fs.getDocs(outsider.service.historyQuery(id)));
 await bob.command('leave',{roomId:id});await denied(fs.getDoc(fs.doc(bob.db,'chatRooms',id)));
 await alice.command('deleteRoom',{roomId:id});await denied(fs.getDocs(history));
 const a=await fs.getDoc(fs.doc(alice.db,'chatAccounts',alice.auth.currentUser.uid));await denied(fs.setDoc(a.ref,{...a.data(),createdCount:0,at:fs.serverTimestamp()}));
 const stale1=await alice.command('create',{name:'stale one'}),stale2=await alice.command('create',{name:'stale two'});
 await assert.rejects(alice.command('create',{name:'over daily quota'}),/24時間/);
 await bob.command('join',{token:stale1.token});await bob.command('join',{token:stale2.token});
 await alice.command('deleteRoom',{roomId:stale1.roomId});await alice.command('deleteRoom',{roomId:stale2.roomId});
 assert.deepEqual((await bob.command('list')).rooms,[]);
 assert.deepEqual((await fs.getDoc(fs.doc(bob.db,'chatAccounts',bob.auth.currentUser.uid))).data().roomIds,[]);
 console.log('PASS: real Google Auth + Firestore; anonymous/outsider denial, atomic invites, verified sender, idempotency/deletion, presence/ripple, invite rotation, exit/revocation, quotas, multiple stale-room cleanup and account tamper denial');
}finally{await Promise.all(clients.map(async c=>{await fs.terminate(c.db);await deleteApp(c.app);}));}
