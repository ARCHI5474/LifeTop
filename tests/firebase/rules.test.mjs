import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp} from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Run through Firebase emulators:exec. Production must not be used.');
const environment = await initializeTestEnvironment({projectId:'demo-lifetop',firestore:{rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8')}});
try {
    const google = uid => environment.authenticatedContext(uid,{firebase:{sign_in_provider:'google.com'}}).firestore();
    const alice=google('alice'), bob=google('bob'), anonymous=environment.unauthenticatedContext().firestore();
    const target=db=>doc(db,'users/alice/lifetop/state');
    const data=revision=>({schema:1,revision,payload:'{"memo":"test"}',updatedAt:serverTimestamp()});
    await assertFails(getDoc(target(anonymous)));
    await assertFails(setDoc(target(anonymous),data(1)));
    await assertFails(setDoc(target(bob),data(1)));
    await assertFails(setDoc(target(alice),data(2)));
    await assertSucceeds(setDoc(target(alice),data(1)));
    await assertSucceeds(getDoc(target(alice)));
    await assertFails(getDoc(target(bob)));
    await assertFails(setDoc(target(alice),data(1)));
    await assertFails(setDoc(target(alice),{...data(2),extra:true}));
    await assertFails(setDoc(target(alice),{...data(2),schema:2}));
    await assertFails(setDoc(target(alice),{...data(2),updatedAt:Timestamp.fromMillis(0)}));
    await assertFails(setDoc(target(alice),{...data(2),payload:'x'.repeat(921601)}));
    await assertFails(deleteDoc(target(alice)));
    await assertFails(getDoc(doc(alice,'unrelated/private')));
    const password=environment.authenticatedContext('alice',{firebase:{sign_in_provider:'password'}}).firestore();
    await assertFails(getDoc(target(password)));
    await assertSucceeds(setDoc(target(alice),data(2)));
    console.log('PASS: only Google owner access, exact schema, revision sequence, size, server time and deletion denial');
} finally { await environment.cleanup(); }
