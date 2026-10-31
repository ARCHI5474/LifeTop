// Firebase Console > Project settings > Your apps > Web app.
// This public web configuration is not a service-account credential.
// Enable only AFTER deploying firestore.rules and enabling Google sign-in.
export const cloudSyncConfig = {
    enabled: true,
    firebase: {
        apiKey: 'AIzaSyBKSmF8C9sP1Vw7tg6_JBC9XkfjrumssQc',
        authDomain: 'lifetop-fc51c.firebaseapp.com',
        projectId: 'lifetop-fc51c',
        appId: '1:220992323764:web:15ae4345973e72241897e1'
    }
};
