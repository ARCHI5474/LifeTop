import {cloudSyncConfig} from './firebase-config.js?v=13.0.1';
import {messagesConfig} from './messages-config.js?v=13.0.1';
const SDK='https://www.gstatic.com/firebasejs/13.1.0';
let pending;
export function googleSession() {
    if (!pending) pending=(async()=>{
        const [apps,authSDK,fs,check]=await Promise.all(['app','auth','firestore','app-check'].map(name=>import(`${SDK}/firebase-${name}.js`)));
        // Chat login must not silently start sync or sign out the separate sync account.
        const app=apps.getApps().find(app=>app.name==='lifetop-messages-google')||apps.initializeApp(cloudSyncConfig.firebase,'lifetop-messages-google');
        const auth=authSDK.getAuth(app);auth.languageCode='ja';
        await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);await auth.authStateReady();
        if(messagesConfig.appCheckSiteKey && location.hostname==='lifetop.pasidea.space'){try{check.initializeAppCheck(app,{provider:new check.ReCaptchaEnterpriseProvider(messagesConfig.appCheckSiteKey),isTokenAutoRefreshEnabled:true});}catch(error){if(error.code!=='appCheck/already-initialized')throw error;}}
        return {app,auth,fs,db:fs.getFirestore(app),watch:callback=>authSDK.onAuthStateChanged(auth,callback),login:()=>{const provider=new authSDK.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return authSDK.signInWithPopup(auth,provider);},logout:()=>authSDK.signOut(auth)};
    })().catch(error=>{pending=null;throw error;});
    return pending;
}
