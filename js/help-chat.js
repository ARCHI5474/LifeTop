import {openUIDialog} from './ui-dialog.js?v=14.0.0';

const topics = [
    {label:'Festival', match:/festival|フェス|ガチャ|14|記念/i, answer:'ホームの「LifeTop14 Festival」から参加できます。14.00秒で止めると14 ptを獲得します。ガチャは前回から3時間後、ボーナスは記念ガチャ3回ごとに引けます。'},
    {label:'Live', match:/live|ライブ|背景|壁紙|音声/i, answer:'Quick の「Live」で背景を切り替えます。設定の「表示」にある Live で景色・場所・動き方を選べます。マイクを利用するときはブラウザーの許可が必要です。'},
    {label:'表示・配色', match:/色|ライト|ダーク|コントラスト|表示|テーマ/i, answer:'Quick のライト・ダーク切り替えを使います。設定の「表示」で配色や高コントラスト、省モーションを設定できます。'},
    {label:'保存・同期', match:/保存|同期|復元|データ|バックアップ/i, answer:'設定の「情報・詳細」でバックアップを保存・復元できます。端末間の同期は「保存と同期」の設定を確認してください。'},
    {label:'ゲーム', match:/ゲーム|遊び|game|studio/i, answer:'Quick の「Studio」から GameBox を開いてゲームを選びます。ゲーム画面の「遊び方を表示」でルールを確認できます。'}
];

export function initHelpChat() {
    document.getElementById('help-chat-open')?.addEventListener('click', () => {
        if (document.getElementById('help-chat')) return;
        const dialog = document.createElement('dialog');
        dialog.id = 'help-chat';
        dialog.className = 'cc-dialog ui-scope help-chat';
        dialog.setAttribute('aria-labelledby', 'help-chat-title');
        dialog.innerHTML = '<header class="pasidea-popup-header"><h2 id="help-chat-title">LifeTop ヘルプ</h2><button type="button" class="cc-control cc-icon" data-cancel aria-label="ヘルプを閉じる"></button></header><div class="help-chat-body"><div class="help-chat-log" role="log" aria-label="会話"></div><div class="mini-tools help-chat-topics" aria-label="よくある質問"></div><form class="help-chat-form"><label for="help-chat-question">質問</label><input id="help-chat-question" maxlength="160" placeholder="例：ガチャはいつ引ける？" required><button type="submit" class="primary-btn">送信</button></form></div>';
        const log = dialog.querySelector('.help-chat-log');
        const input = dialog.querySelector('input');
        function append(speaker, message) {
            const row = document.createElement('div');
            row.className = speaker === 'あなた' ? 'help-chat-question' : 'help-chat-answer';
            const name = document.createElement('strong');
            const body = document.createElement('p');
            name.textContent = speaker;
            body.textContent = message;
            row.append(name, body);
            log.append(row);
            log.scrollTop = log.scrollHeight;
        }
        function respond(question, topic = topics.find(candidate => candidate.match.test(question))) {
            append('あなた', question);
            append('ヘルプ', topic?.answer ?? '近い項目を下から選ぶか、「配色」「同期」「ゲーム」などの言葉で質問してください。');
        }
        append('ヘルプ', '知りたいことを入力するか、下の項目を選んでください。');
        for (const topic of topics) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'tonal-btn';
            button.textContent = topic.label;
            button.onclick = () => respond(topic.label, topic);
            dialog.querySelector('.help-chat-topics').append(button);
        }
        dialog.querySelector('form').onsubmit = event => {
            event.preventDefault();
            const question = input.value.trim();
            if (!question) return;
            respond(question);
            input.value = '';
        };
        document.body.append(dialog);
        openUIDialog(dialog);
    });
}
