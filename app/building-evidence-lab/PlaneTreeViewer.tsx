"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type InspectMode = "full" | "structure" | "bark";
type CameraPreset = "whole" | "trunk" | "fork" | "crown";

type TreeSceneHandles = {
  setMode: (mode: InspectMode) => void;
  setPreset: (preset: CameraPreset) => void;
  setTurntable: (enabled: boolean) => void;
};

const CAMERA_PRESETS: Array<{ id: CameraPreset; label: string; caption: string }> = [
  { id: "whole", label: "整树", caption: "13 m 比例" },
  { id: "trunk", label: "树皮", caption: "斑驳层" },
  { id: "fork", label: "分叉", caption: "枝级结构" },
  { id: "crown", label: "树冠", caption: "叶片空隙" },
];

const MODES: Array<{ id: InspectMode; label: string; caption: string }> = [
  { id: "full", label: "完整形态", caption: "材质 + 叶片" },
  { id: "structure", label: "枝干结构", caption: "隐藏树叶" },
  { id: "bark", label: "树皮研究", caption: "聚焦斑驳层" },
];

function createPersonReference() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x9f5e48,
    roughness: 0.9,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.78, 4, 8), material);
  body.position.y = 0.91;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), material);
  head.position.y = 1.6;
  const legLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.48, 3, 6), material);
  legLeft.position.set(-0.08, 0.31, 0);
  legLeft.rotation.z = 0.04;
  const legRight = legLeft.clone();
  legRight.position.x = 0.08;
  legRight.rotation.z = -0.04;
  group.add(body, head, legLeft, legRight);
  group.position.set(-4.5, 0.02, 1.2);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = true;
  });
  return group;
}

function createHeightRuler() {
  const group = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x52695b,
    transparent: true,
    opacity: 0.56,
  });
  const vertical = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-5.3, 0.02, 0),
    new THREE.Vector3(-5.3, 13.4, 0),
  ]);
  group.add(new THREE.Line(vertical, lineMaterial));
  for (let metre = 0; metre <= 13; metre += 1) {
    const width = metre % 5 === 0 ? 0.42 : 0.19;
    const tick = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5.3, metre, 0),
      new THREE.Vector3(-5.3 + width, metre, 0),
    ]);
    group.add(new THREE.Line(tick, lineMaterial));
  }
  return group;
}

function applyLeafWind(material: THREE.Material, uniforms: Array<{ value: number }>) {
  const standard = material as THREE.MeshStandardMaterial;
  standard.side = THREE.DoubleSide;
  standard.onBeforeCompile = (shader) => {
    const time = { value: 0 };
    uniforms.push(time);
    shader.uniforms.uTreeTime = time;
    shader.vertexShader = `uniform float uTreeTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
        #include <begin_vertex>
        float crownMask = smoothstep(5.4, 11.8, position.y);
        float breeze = sin(uTreeTime * 0.72 + position.x * 0.85 + position.y * 0.42);
        transformed.x += breeze * 0.026 * crownMask;
        transformed.z += cos(uTreeTime * 0.58 + position.z * 0.91) * 0.018 * crownMask;
      `,
    );
  };
  standard.needsUpdate = true;
}

function applyProceduralBark(material: THREE.Material) {
  const standard = material as THREE.MeshStandardMaterial;
  standard.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vTreeBarkPosition;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
        #include <begin_vertex>
        vTreeBarkPosition = position;
      `,
    );
    shader.fragmentShader = `
      varying vec3 vTreeBarkPosition;

      float barkHash(vec3 point) {
        point = fract(point * 0.3183099 + vec3(0.13, 0.17, 0.19));
        point *= 17.0;
        return fract(point.x * point.y * point.z * (point.x + point.y + point.z));
      }

      float barkNoise(vec3 point) {
        vec3 cell = floor(point);
        vec3 local = fract(point);
        local = local * local * (3.0 - 2.0 * local);
        return mix(
          mix(
            mix(barkHash(cell), barkHash(cell + vec3(1.0, 0.0, 0.0)), local.x),
            mix(barkHash(cell + vec3(0.0, 1.0, 0.0)), barkHash(cell + vec3(1.0, 1.0, 0.0)), local.x),
            local.y
          ),
          mix(
            mix(barkHash(cell + vec3(0.0, 0.0, 1.0)), barkHash(cell + vec3(1.0, 0.0, 1.0)), local.x),
            mix(barkHash(cell + vec3(0.0, 1.0, 1.0)), barkHash(cell + vec3(1.0, 1.0, 1.0)), local.x),
            local.y
          ),
          local.z
        );
      }

      float barkFbm(vec3 point) {
        float value = barkNoise(point) * 0.58;
        value += barkNoise(point * 2.07 + 3.1) * 0.28;
        value += barkNoise(point * 4.13 + 7.7) * 0.14;
        return value;
      }
      ${shader.fragmentShader}
    `;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `
        #include <color_fragment>
        vec3 barkPoint = vTreeBarkPosition * vec3(1.85, 0.48, 1.85);
        float broadPatch = barkFbm(barkPoint);
        float smallPatch = barkFbm(barkPoint * 1.72 + vec3(4.2, 1.7, 2.6));
        vec3 barkBase = vec3(0.178, 0.156, 0.098);
        vec3 barkSage = vec3(0.315, 0.309, 0.202);
        vec3 barkCream = vec3(0.578, 0.510, 0.296);
        vec3 barkUmber = vec3(0.071, 0.056, 0.041);
        vec3 proceduralBark = mix(barkBase, barkSage, smoothstep(0.48, 0.515, broadPatch));
        proceduralBark = mix(proceduralBark, barkCream, smoothstep(0.625, 0.66, broadPatch));
        proceduralBark = mix(proceduralBark, barkUmber, 1.0 - smoothstep(0.22, 0.255, smallPatch));
        float verticalGrain = sin(vTreeBarkPosition.y * 10.0 + smallPatch * 6.0) * 0.025;
        diffuseColor.rgb = proceduralBark + verticalGrain;
      `,
    );
  };
  standard.needsUpdate = true;
}

export function PlaneTreeViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<TreeSceneHandles | null>(null);
  const [mode, setMode] = useState<InspectMode>("full");
  const [preset, setPreset] = useState<CameraPreset>("whole");
  const [turntable, setTurntable] = useState(true);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  const chooseMode = useCallback((nextMode: InspectMode) => {
    setMode(nextMode);
    sceneRef.current?.setMode(nextMode);
    if (nextMode === "bark") {
      setPreset("trunk");
      sceneRef.current?.setPreset("trunk");
    }
  }, []);

  const choosePreset = useCallback((nextPreset: CameraPreset) => {
    setPreset(nextPreset);
    sceneRef.current?.setPreset(nextPreset);
  }, []);

  const toggleTurntable = useCallback(() => {
    setTurntable((current) => {
      sceneRef.current?.setTurntable(!current);
      return !current;
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcbdde0);
    scene.fog = new THREE.FogExp2(0xcbdde0, 0.018);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(16.2, 9.0, 18.8);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 2.3;
    controls.maxDistance = 34;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 6.2, 0);

    scene.add(new THREE.HemisphereLight(0xfff3dc, 0x52685b, 2.35));
    const sun = new THREE.DirectionalLight(0xffe8bc, 4.1);
    sun.position.set(-9, 17, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -5;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xa3c6c1, 1.45);
    fill.position.set(12, 9, -10);
    scene.add(fill);

    const stage = new THREE.Group();
    const pavement = new THREE.Mesh(
      new THREE.CylinderGeometry(7.25, 7.55, 0.38, 64),
      new THREE.MeshStandardMaterial({ color: 0xd8cfbc, roughness: 0.96 }),
    );
    pavement.position.y = -0.21;
    pavement.scale.z = 0.78;
    pavement.receiveShadow = true;
    stage.add(pavement);
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.45, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: 0x6b654f, roughness: 1 }),
    );
    soil.position.y = 0.01;
    soil.receiveShadow = true;
    stage.add(soil);
    const curb = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.09, 7, 48),
      new THREE.MeshStandardMaterial({ color: 0xb8ad98, roughness: 0.96 }),
    );
    curb.rotation.x = Math.PI / 2;
    curb.position.y = 0.08;
    curb.receiveShadow = true;
    stage.add(curb);
    stage.add(createPersonReference(), createHeightRuler());
    scene.add(stage);

    const treeRoot = new THREE.Group();
    treeRoot.name = "xinhua-plane-tree-hero";
    scene.add(treeRoot);
    const leaves: THREE.Mesh[] = [];
    const barkPatches: THREE.Mesh[] = [];
    const windUniforms: Array<{ value: number }> = [];
    let currentMode: InspectMode = "full";
    let autoTurn = true;

    const applyMode = (nextMode: InspectMode) => {
      currentMode = nextMode;
      if (nextMode === "structure") treeRoot.rotation.y = 0.28;
      if (nextMode === "bark") treeRoot.rotation.y = 0.12;
      leaves.forEach((mesh) => {
        mesh.visible = nextMode !== "structure";
      });
      barkPatches.forEach((mesh) => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          material.transparent = nextMode === "structure";
          material.opacity = nextMode === "structure" ? 0.76 : 1;
          material.needsUpdate = true;
        });
      });
      stage.children.forEach((object) => {
        if (object.type === "Line") object.visible = nextMode !== "bark";
      });
    };

    const setCameraPreset = (nextPreset: CameraPreset) => {
      const views: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
        whole: { position: [16.2, 9.0, 18.8], target: [0, 6.2, 0] },
        trunk: { position: [5.7, 3.45, 7.2], target: [0, 2.55, 0] },
        fork: { position: [7.1, 7.0, 8.6], target: [0, 5.65, 0] },
        crown: { position: [11.2, 10.2, 13.3], target: [0, 9.2, 0] },
      };
      const view = views[nextPreset];
      camera.position.set(...view.position);
      controls.target.set(...view.target);
      controls.minDistance = nextPreset === "trunk" ? 1.5 : 2.3;
      controls.update();
    };

    sceneRef.current = {
      setMode: applyMode,
      setPreset: setCameraPreset,
      setTurntable: (enabled) => {
        autoTurn = enabled;
      },
    };

    const loader = new GLTFLoader();
    loader.load(
      "/models/building-evidence-lab/xinhua-plane-tree-hero.glb?v=3",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
          const name = object.name.toLowerCase();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (name.includes("leaf")) {
            leaves.push(object);
            materials.forEach((material) => applyLeafWind(material, windUniforms));
          }
          if (name.includes("wood")) {
            materials.forEach((material) => applyProceduralBark(material));
          }
          if (name.includes("bark")) barkPatches.push(object);
        });
        const box = new THREE.Box3().setFromObject(model);
        // 生成器以树干根部为世界原点；保留这个原点，转台时树干才不会绕树冠中心“公转”。
        model.position.set(0, -box.min.y, 0);
        treeRoot.add(model);
        applyMode(currentMode);
        setReady(true);
      },
      undefined,
      () => {
        setLoadError("模型没有成功载入，请刷新页面重试。");
      },
    );

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    resize();

    const animationStart = window.performance.now();
    let animationFrame = 0;
    const render = () => {
      animationFrame = window.requestAnimationFrame(render);
      const elapsed = (window.performance.now() - animationStart) / 1000;
      windUniforms.forEach((uniform) => {
        uniform.value = elapsed;
      });
      if (autoTurn && currentMode === "full") treeRoot.rotation.y += 0.00125;
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      sceneRef.current = null;
    };
  }, []);

  return (
    <main className="tree-page">
      <header className="tree-header">
        <a href="/building-evidence-lab" className="tree-back" aria-label="返回新华 Wonder 工作台">
          <span aria-hidden="true">←</span>
          <b>新华 WONDER</b>
        </a>
        <p>HERO ASSET STUDY · 01</p>
        <span className="tree-live"><i /> REAL-TIME WEBGL</span>
      </header>

      <section className="tree-hero">
        <div className="tree-copy">
          <p className="tree-kicker">PLATANUS × HISPANICA</p>
          <h1>一棵真的能走近看的<br /><span>3D 上海梧桐。</span></h1>
          <p className="tree-lead">
            它不是“圆柱 + 绿球”的占位树。斑驳树皮、五向主叉、二三级枝、
            五裂叶片与树冠空隙，都被做成了可从任意角度查看的几何。
          </p>
        </div>

        <div className="tree-specs" aria-label="模型核心数据">
          <div><small>HEIGHT</small><b>13.1 m</b><span>成熟街道尺度</span></div>
          <div><small>LEAVES</small><b>1,939</b><span>独立五裂轮廓</span></div>
          <div><small>RUNTIME</small><b>7 nodes</b><span>0 张照片贴图</span></div>
        </div>
      </section>

      <section className="tree-lab" aria-label="梧桐树三维检查器">
        <aside className="tree-panel tree-panel-left">
          <div>
            <p className="tree-panel-kicker">01 / DISPLAY</p>
            <h2>看哪一层？</h2>
          </div>
          <nav className="tree-mode-list" aria-label="模型显示模式">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseMode(item.id)}
                className={mode === item.id ? "is-active" : ""}
                aria-pressed={mode === item.id}
              >
                <i />
                <span><b>{item.label}</b><small>{item.caption}</small></span>
              </button>
            ))}
          </nav>
          <div className="tree-feature-note">
            <span>IDENTITY CUE</span>
            <b>斑驳不是贴图</b>
            <p>奶油色、鼠尾草灰和深褐色树皮斑块都是真实几何层，近看仍有轮廓。</p>
          </div>
          <button
            type="button"
            className={`tree-turntable ${turntable ? "is-active" : ""}`}
            onClick={toggleTurntable}
            aria-pressed={turntable}
          >
            <span><i /> 自动转台</span>
            <b>{turntable ? "ON" : "OFF"}</b>
          </button>
        </aside>

        <section className="tree-stage">
          <canvas ref={canvasRef} aria-label="可旋转缩放的三维上海梧桐模型" />
          <div className="tree-stage-wash" />
          <div className="tree-stage-top">
            <p>
              <span className={ready ? "is-ready" : ""} />
              <small>{ready ? "HERO ASSET READY" : "LOADING GEOMETRY"}</small>
            </p>
            <span>拖动旋转 · 滚轮 / 双指缩放</span>
          </div>
          <div className="tree-height-label"><b>13.1 m</b><span>成熟树高</span></div>
          <div className="tree-human-label"><b>1.72 m</b><span>人物参照</span></div>
          {loadError && <p className="tree-error" role="alert">{loadError}</p>}
          <div className="tree-camera-tabs">
            {CAMERA_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => choosePreset(item.id)}
                className={preset === item.id ? "is-active" : ""}
                aria-pressed={preset === item.id}
              >
                <b>{item.label}</b><small>{item.caption}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="tree-panel tree-panel-right">
          <div>
            <p className="tree-panel-kicker">02 / MODEL DNA</p>
            <h2>精细度做在哪里？</h2>
          </div>
          <ol className="tree-dna">
            <li>
              <span>01</span>
              <div><b>识别先于密度</b><p>高分叉、长侧枝与不对称树冠，远看就不是普通景观树。</p></div>
            </li>
            <li>
              <span>02</span>
              <div><b>枝干真正相连</b><p>叶子隐藏后，主干到三级枝仍形成完整、可读的受力结构。</p></div>
            </li>
            <li>
              <span>03</span>
              <div><b>叶片不是树冠球</b><p>1,939 枚掌状五裂叶片以三组色阶组成有空隙的树冠。</p></div>
            </li>
            <li>
              <span>04</span>
              <div><b>为游戏实时运行</b><p>7 个节点、无照片纹理；后续可继续做 LOD 与林荫道实例化。</p></div>
            </li>
          </ol>
          <div className="tree-fidelity">
            <p><span>目标图视觉接近度</span><b>Hero 资产</b></p>
            <div><i /></div>
            <small>当前重点：单棵近景质量。下一步才是整条新华路的多变体与性能预算。</small>
          </div>
        </aside>
      </section>

      <footer className="tree-footer">
        <p>
          <span>证据</span>
          实景照片确认树形、叶片与树皮；宣传图只负责定义风格，不替代事实。
        </p>
        <a href="/building-evidence-lab">返回照片建模工作台 <span aria-hidden="true">→</span></a>
      </footer>
    </main>
  );
}
