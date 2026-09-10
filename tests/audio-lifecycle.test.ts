import {expect,it,vi} from 'vitest';
import {Synth} from '../src/audio/synth';
it('pause latches silence while the audio clock is suspended and later resumes the mix',()=>{
  const synth=new Synth();
  const gain={value:0.42,cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()};
  synth.context={currentTime:3,state:'suspended'} as AudioContext;
  synth.musicGain={gain} as unknown as GainNode;
  synth.update(0,false,{phase:'paused',kind:'combat',bossPhase:0});
  expect(gain.value).toBe(0);
  expect(gain.setValueAtTime).toHaveBeenCalledWith(0,3);
  synth.update(0,true,{phase:'playing',kind:'combat',bossPhase:0});
  expect(gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.42,3.012);
});
