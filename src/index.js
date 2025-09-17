import "./styles.css";
import { PUBLIC_PATH } from './js/public_path';
import { VideoFrameProvider } from './js/video_frame_provider';
import { CameraFrameProvider } from './js/camera_frame_provider';
import { FacemeshLandmarksProvider } from './js/facemesh/landmarks_provider';
import { SceneManager } from "./js/three_components/scene_manager";

const template = `
<div class="video-container">
  <span class="loader">
    Loading ...
  </span>
  <div>
    <h2>Original Video</h2>
    <video class="input_video" controls playsinline>
      <source  src="${PUBLIC_PATH}/video/videoplayback2.mp4">
    </video>
  </div>
  <div>
    <h2>Processed Video</h2>
    <canvas class="output_canvas"></canvas>
  </div>
  <div class="panel adjustments" style="font-family: sans-serif; max-width:420px; background:#111; color:#eee; padding:8px 12px; border-radius:6px; margin-top:12px; line-height:1.3;">
    <h3 style="margin:4px 0 8px; font-size:16px;">Glasses Offset</h3>
    <div style="display:grid; grid-template-columns:60px 1fr; gap:4px 8px; align-items:center; font-size:12px;">
      <label>Pos X</label><input type="range" min="-200" max="200" step="1" value="0" data-offset="posX" />
      <label>Pos Y</label><input type="range" min="-200" max="200" step="1" value="0" data-offset="posY" />
      <label>Pos Z</label><input type="range" min="-200" max="200" step="1" value="0" data-offset="posZ" />
      <label>Rot X</label><input type="range" min="-180" max="180" step="1" value="0" data-offset="rotX" />
      <label>Rot Y</label><input type="range" min="-180" max="180" step="1" value="0" data-offset="rotY" />
      <label>Rot Z</label><input type="range" min="-180" max="180" step="1" value="0" data-offset="rotZ" />
      <label>Scale</label><input type="range" min="0.1" max="3" step="0.01" value="1" data-offset="scale" />
      <button type="button" style="grid-column:1/3; margin-top:4px; padding:4px 6px; background:#333; color:#eee; border:1px solid #555; cursor:pointer;" class="reset-offsets">Reset</button>
    </div>
  </div>
</div>
`;

document.querySelector("#app").innerHTML = template;

async function main() {

  document.querySelector(".video-container").classList.add("loading");

  const video = document.querySelector('.input_video');
  const canvas = document.querySelector('.output_canvas');

  const useOrtho = true;
  const debug = true;

  let sceneManager;
  let facemeshLandmarksProvider;
  let videoFrameProvider;

  const onLandmarks = ({image, landmarks}) => {
    sceneManager.onLandmarks(image, landmarks);
  }

  const onFrame = async (video) => {
    try {
      await facemeshLandmarksProvider.send(video);
    } catch (e) {
      alert("Not Supported on your device")
      console.error(e);
      videoFrameProvider.stop();      
    }
  }

  function animate () {
    requestAnimationFrame(animate);
    sceneManager.resize(video.clientWidth, video.clientHeight);
    sceneManager.animate();
  }

  sceneManager = new SceneManager(canvas, debug, useOrtho);
  facemeshLandmarksProvider = new FacemeshLandmarksProvider(onLandmarks);

  if (confirm("Use Camera?")) {
    // unload video
    video.pause();
    video.querySelector("source").remove();
    video.removeAttribute('src');
    video.load();

    videoFrameProvider = new CameraFrameProvider(video, onFrame);

  } else {

    videoFrameProvider = new VideoFrameProvider(video, onFrame);

  }
  
  await facemeshLandmarksProvider.initialize();
  videoFrameProvider.start();

  animate();

  document.querySelector(".video-container").classList.remove("loading");

  // Wire up offset panel
  const offsetInputs = document.querySelectorAll('.panel.adjustments input[type="range"][data-offset]');
  const resetBtn = document.querySelector('.panel.adjustments .reset-offsets');

  function applyOffsets() {
    if (!sceneManager || !sceneManager.glasses) return;
    let posX = parseFloat(document.querySelector('[data-offset="posX"]').value);
    let posY = parseFloat(document.querySelector('[data-offset="posY"]').value);
    let posZ = parseFloat(document.querySelector('[data-offset="posZ"]').value);
    let rotX = parseFloat(document.querySelector('[data-offset="rotX"]').value) * Math.PI / 180;
    let rotY = parseFloat(document.querySelector('[data-offset="rotY"]').value) * Math.PI / 180;
    let rotZ = parseFloat(document.querySelector('[data-offset="rotZ"]').value) * Math.PI / 180;
    let scale = parseFloat(document.querySelector('[data-offset="scale"]').value);
    sceneManager.glasses.setPositionOffset(posX, posY, posZ);
    sceneManager.glasses.setRotationOffset(rotX, rotY, rotZ);
    sceneManager.glasses.setScaleMultiplier(scale);
  }

  offsetInputs.forEach(inp => {
    inp.addEventListener('input', applyOffsets);
    inp.addEventListener('change', applyOffsets);
  });

  resetBtn.addEventListener('click', () => {
    offsetInputs.forEach(inp => {
      if (inp.dataset.offset === 'scale') {
        inp.value = 1;
      } else {
        inp.value = 0;
      }
    });
    applyOffsets();
  });
}

main();
