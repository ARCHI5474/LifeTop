import {huntSpots} from './festival-hunt-spots.js';
import {eventWindow,discoverEgg} from './festival-model.js';
export function findHiddenTen(state,config,id,now=Date.now()) {
 if(eventWindow(config,now).phase!=='active')throw Error('10かくれんぼの開催期間外です。');
 if(!huntSpots.some(spot=>spot.id===id))throw Error('未対応の隠れた10です。');
 state.hideAndSeek??={found:{}};state.hideAndSeek.found[id]??=now;
 if(Object.keys(state.hideAndSeek.found).length===huntSpots.length)discoverEgg(state,config,'home',now);
 return state;
}
