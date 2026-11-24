// The v10 archive remains readable in the same browser.
const archive = typeof location !== 'undefined'
  && location.pathname.endsWith('/festival.html')
  && new URLSearchParams(location.search).get('edition') === '10';

export const festivalConfig = Object.freeze(archive ? {
  edition: 10,
  startAt: '2026-11-07T14:11:54+09:00',
  durationDays: 10,
  endAt: '2026-11-12T23:10:54+09:00'
} : {
  edition: 14,
  startAt: '2026-11-24T00:00:00+09:00',
  durationDays: 5
});
