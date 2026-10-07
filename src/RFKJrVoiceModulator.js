import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import logo from './assets/kennedy-fried-chords-logo.png';

const FIXED_SETTINGS = {
  pitchAmount: -1.5,
  raspinessAmount: 0.3,
  dropoutFrequency: 7.5,
  dropoutDepth: 0.85,
  lowered: true,
  raspy: true,
  nasal: true,
  vocalDropouts: true,
};

const RFKJrVoiceModulator = () => {
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [micPermission, setMicPermission] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [inputLevel, setInputLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingTimerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const micRef = useRef(null);
  const analyzerRef = useRef(null);
  const distortionRef = useRef(null);
  const pitchShiftRef = useRef(null);
  const gateRef = useRef(null);
  const tremoloRef = useRef(null);
  const noiseRef = useRef(null);
  const noiseGainRef = useRef(null);
  const eqLowRef = useRef(null);
  const eqMidRef = useRef(null);
  const eqHighRef = useRef(null);
  const waveshaperRef = useRef(null);
  const compressorRef = useRef(null);
  const volumeNodeRef = useRef(null);
  const recorderRef = useRef(null);

  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermission(true);
      } catch (err) {
        setErrorMessage('Microphone access denied. Please allow microphone access to use Kennedy Fried Chords.');
        console.error('Error accessing microphone:', err);
      }
    };

    initAudio();

    return () => {
      stopAudioProcessing();
      stopRecording();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const makeRaspyCurve = (amount) => {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const hardness = amount * 10;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(Math.abs(x) * hardness) * Math.sign(x);
      if (i % 4 === 0) {
        curve[i] *= 1.1;
      }
    }

    return curve;
  };

  const updateMeter = () => {
    if (analyzerRef.current) {
      const waveform = analyzerRef.current.getValue();
      let sum = 0;
      for (let i = 0; i < waveform.length; i++) {
        sum += waveform[i] * waveform[i];
      }
      const rms = Math.sqrt(sum / waveform.length);
      setInputLevel(rms * 2);
    }

    animationFrameRef.current = requestAnimationFrame(updateMeter);
  };

  const startAudioProcessing = async () => {
    try {
      setErrorMessage('');
      await Tone.start();

      micRef.current = new Tone.UserMedia();
      await micRef.current.open();

      analyzerRef.current = new Tone.Analyser('waveform', 128);
      micRef.current.connect(analyzerRef.current);

      waveshaperRef.current = new Tone.WaveShaper(makeRaspyCurve(FIXED_SETTINGS.raspinessAmount));
      distortionRef.current = new Tone.Distortion({
        distortion: FIXED_SETTINGS.raspinessAmount,
        wet: 0.5,
      });
      pitchShiftRef.current = new Tone.PitchShift({
        pitch: FIXED_SETTINGS.pitchAmount,
        windowSize: 0.1,
        delayTime: 0.05,
      });
      eqLowRef.current = new Tone.Filter({
        type: 'lowshelf',
        frequency: 300,
        gain: 6,
      });
      eqMidRef.current = new Tone.Filter({
        type: 'peaking',
        frequency: 1800,
        Q: 2,
        gain: 10,
      });
      eqHighRef.current = new Tone.Filter({
        type: 'highshelf',
        frequency: 5000,
        gain: -10,
      });
      gateRef.current = new Tone.Gate({
        threshold: -40,
        attack: 0.01,
        release: 0.01,
      });
      tremoloRef.current = new Tone.Tremolo({
        frequency: FIXED_SETTINGS.dropoutFrequency,
        depth: FIXED_SETTINGS.dropoutDepth,
        type: 'square',
        spread: 0,
      }).start();
      noiseRef.current = new Tone.Noise('brown').start();
      noiseGainRef.current = new Tone.Gain(0.12);
      noiseRef.current.connect(noiseGainRef.current);
      compressorRef.current = new Tone.Compressor({
        threshold: -20,
        ratio: 4,
        attack: 0.005,
        release: 0.1,
      });
      volumeNodeRef.current = new Tone.Volume(Tone.gainToDb(volume));
      recorderRef.current = new Tone.Recorder();

      micRef.current.chain(
        waveshaperRef.current,
        distortionRef.current,
        pitchShiftRef.current,
        eqLowRef.current,
        eqMidRef.current,
        eqHighRef.current,
        tremoloRef.current,
        gateRef.current,
        compressorRef.current,
        volumeNodeRef.current,
      );

      volumeNodeRef.current.connect(Tone.getDestination());
      volumeNodeRef.current.connect(recorderRef.current);
      noiseGainRef.current.connect(compressorRef.current);

      updateMeter();
      setIsActive(true);
    } catch (err) {
      setErrorMessage('Error starting audio processing: ' + err.message);
      console.error('Error starting audio processing:', err);
    }
  };

  const stopAudioProcessing = () => {
    if (micRef.current) {
      micRef.current.close();

      [
        waveshaperRef.current,
        distortionRef.current,
        pitchShiftRef.current,
        tremoloRef.current,
        gateRef.current,
        noiseRef.current,
        noiseGainRef.current,
        eqLowRef.current,
        eqMidRef.current,
        eqHighRef.current,
        compressorRef.current,
        volumeNodeRef.current,
        analyzerRef.current,
        recorderRef.current,
      ].forEach(node => {
        if (node) node.dispose();
      });

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setIsActive(false);
    }
  };

  const startRecording = async () => {
    if (!isActive || !recorderRef.current) {
      setErrorMessage('Please start the modulator before recording.');
      return;
    }

    try {
      recorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMessage('Error starting recording: ' + err.message);
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !recorderRef.current) return;

    try {
      const recording = await recorderRef.current.stop();
      const url = URL.createObjectURL(recording);
      setRecordedAudio(url);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setIsRecording(false);
    } catch (err) {
      if (err.message.includes('not started')) {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setIsRecording(false);
        setErrorMessage('Recording error: Make sure the modulator is running before recording.');
      } else {
        setErrorMessage('Error stopping recording: ' + err.message);
        console.error('Error stopping recording:', err);
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (volumeNodeRef.current) {
      volumeNodeRef.current.volume.value = Tone.gainToDb(newVolume);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="kfc-shell">
      <div className="kfc-card">
        <div className="kfc-brand-block">
          <div className="kfc-topline">ORIGINAL RECIPE • LIVE MIC • BROWSER FRIED</div>
          <img src={logo} alt="Kennedy Fried Chords logo" className="kfc-logo" />
          <p className="kfc-tagline">A live satirical voice modulator. No clone, no speech synthesis — just your microphone run through a deliberately overcooked signal chain.</p>
          <div className="kfc-badge-row">
            <span>PRESSURE FRIED AUDIO</span>
            <span>4-INGREDIENT HOUSE RECIPE</span>
            <span>0% VOICE CLONING</span>
          </div>
        </div>

        {errorMessage && (
          <div className="kfc-alert">
            {errorMessage}
          </div>
        )}

        <div className="kfc-fixed-settings">
          <div className="kfc-settings-header">
            <h3>The House Recipe</h3>
            <span>NO SUBSTITUTIONS</span>
          </div>
          <div className="kfc-settings-grid">
            <div className="kfc-setting-row">
              <span>Pitch Amount</span>
              <strong>{FIXED_SETTINGS.pitchAmount}</strong>
              <small>Deeper ⟶ Less Deep</small>
            </div>
            <div className="kfc-setting-row">
              <span>Raspiness Amount</span>
              <strong>{FIXED_SETTINGS.raspinessAmount}</strong>
              <small>Less Raspy ⟶ More Raspy</small>
            </div>
            <div className="kfc-setting-row">
              <span>Dropout Frequency</span>
              <strong>{FIXED_SETTINGS.dropoutFrequency} Hz</strong>
              <small>Less Frequent ⟶ More Frequent</small>
            </div>
            <div className="kfc-setting-row">
              <span>Dropout Intensity</span>
              <strong>{(FIXED_SETTINGS.dropoutDepth * 100).toFixed(0)}%</strong>
              <small>None ⟶ Complete</small>
            </div>
          </div>
        </div>

        <div className="kfc-meter-wrap">
          <div className="kfc-meter-label-row">
            <span>Input Level</span>
          </div>
          <div className="kfc-meter-track">
            <div
              className="kfc-meter-fill"
              style={{ width: `${Math.min(inputLevel * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="kfc-volume-wrap">
          <div className="kfc-meter-label-row">
            <span>Output Volume</span>
            <strong>{Math.round(volume * 100)}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="kfc-range"
          />
        </div>

        <div className="kfc-controls">
          <button
            onClick={isActive ? stopAudioProcessing : startAudioProcessing}
            disabled={!micPermission}
            className={`kfc-button kfc-button-primary ${isActive ? 'is-stop' : ''}`}
          >
            {isActive ? 'Stop Modulator' : 'Start Real-Time Modulator'}
          </button>

          {isActive && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`kfc-button kfc-button-secondary ${isRecording ? 'is-recording' : ''}`}
            >
              {isRecording ? `Stop Recording (${formatTime(recordingDuration)})` : 'Record Output'}
            </button>
          )}
        </div>

        {recordedAudio && (
          <div className="kfc-recording-card">
            <p>Your processed recording</p>
            <audio controls src={recordedAudio} className="kfc-audio" />
            <div className="kfc-recording-actions">
              <a href={recordedAudio} download="kennedy-fried-chords.webm">Download recording</a>
              <button onClick={() => setRecordedAudio(null)} className="kfc-text-button">Delete</button>
            </div>
          </div>
        )}

        <div className="kfc-note">
          <p>
            The recipe is intentionally fixed: lower pitch, added rasp, nasal resonance, and aggressive intermittent dropouts. Input metering and final output volume stay adjustable so the joke still behaves like an actual audio tool.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RFKJrVoiceModulator;
