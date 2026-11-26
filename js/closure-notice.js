const dismissedKey='lifetop_closure_notice_dismissed';

export function initClosureNotice() {
    const dialog=document.getElementById('closure-notice-dialog');
    const status=document.getElementById('closure-notice-status');
    document.getElementById('closure-notice-close').addEventListener('click',()=>dialog.close());
    document.getElementById('closure-notice-dismiss').addEventListener('click',()=>{
        try {
            localStorage.setItem(dismissedKey,'true');
            dialog.close();
        } catch {
            status.textContent='設定を保存できませんでした。次回もこのお知らせが表示されます。';
            status.hidden=false;
        }
    });

    let dismissed=false;
    try {
        dismissed=localStorage.getItem(dismissedKey)==='true';
    } catch {}
    if(!dismissed)dialog.showModal();
}
