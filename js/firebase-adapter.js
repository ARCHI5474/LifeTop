const SDK = 'https://www.gstatic.com/firebasejs/13.1.0';

export async function createFirebaseAdapter(config) {
    const [appSDK, authSDK, dbSDK] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`)
    ]);
    const app = appSDK.initializeApp(config, 'lifetop-sync');
    const auth = authSDK.getAuth(app);
    auth.languageCode = 'ja';
    const db = dbSDK.getFirestore(app);
    const ref = uid => dbSDK.doc(db, 'users', uid, 'lifetop', 'state');
    return {
        onAuth: callback => authSDK.onAuthStateChanged(auth, callback),
        signIn: () => {
            const provider = new authSDK.GoogleAuthProvider();
            provider.setCustomParameters({prompt:'select_account'});
            return authSDK.signInWithPopup(auth, provider);
        },
        signOut: () => authSDK.signOut(auth),
        watch(uid, callback, onError) {
            return dbSDK.onSnapshot(ref(uid), {includeMetadataChanges:true}, snapshot => {
                if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) callback();
            }, onError);
        },
        async read(uid) {
            const snapshot = await dbSDK.getDocFromServer(ref(uid));
            return snapshot.exists() ? snapshot.data() : null;
        },
        async write(uid, expectedRevision, payload, isCurrent) {
            await dbSDK.runTransaction(db, async transaction => {
                const doc = ref(uid);
                const snapshot = await transaction.get(doc);
                if (!isCurrent() || auth.currentUser?.uid !== uid) throw new Error('account changed');
                if ((snapshot.exists() ? snapshot.data().revision : 0) !== expectedRevision) {
                    const error = new Error('conflict'); error.code = 'sync/conflict'; throw error;
                }
                transaction.set(doc, {schema:1, revision:expectedRevision+1, payload, updatedAt:dbSDK.serverTimestamp()});
            });
        }
    };
}
