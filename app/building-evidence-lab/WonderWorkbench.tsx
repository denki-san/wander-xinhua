"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  PRESET_ANALYSES,
  analyzePixelData,
  mergeImageAnalyses,
  profileFromAnalysis,
  type GeneratedProfile,
  type ImageAnalysis,
} from "./lib/image-analysis";

type WorkMode = "evidence" | "massing" | "wonder" | "wander";
type ViewPreset = "canonical" | "quarter" | "top" | "street";
type LayerKey = "footprint" | "rays" | "uncertainty";
type ModelSource = "preset" | "generated";

type UploadedImage = {
  id: string;
  name: string;
  url: string;
  analysis: ImageAnalysis;
};

type PoiPreset = {
  id: "house-315" | "shanghai-cinema" | "hudec-memorial" | "wukang-mansion";
  short: string;
  name: string;
  address: string;
  modelPath: string;
  modelCode: string;
  targetWidth: number;
  yaw: number;
  canonical: string;
  evidence: string;
  status: string;
  identity: string[];
  challenge: string;
  palette: string[];
  confidence: {
    identity: number;
    position: number;
    scale: number;
    orientation: number;
  };
};

type SceneHandles = {
  setMode: (mode: WorkMode) => void;
  setView: (view: ViewPreset) => void;
  setPreset: (preset: PoiPreset) => void;
  setGeneratedProfile: (profile: GeneratedProfile, source: ModelSource) => void;
  setLayer: (key: LayerKey, visible: boolean) => void;
};

const POIS: PoiPreset[] = [
  {
    id: "wukang-mansion",
    short: "1850",
    name: "武康大楼",
    address: "淮海中路 1850 号",
    modelPath: "/models/building-evidence-lab/wukang-mansion.glb",
    modelCode: "WK-1850",
    targetWidth: 17.8,
    yaw: 0.04,
    canonical: "西端航拍三分之四 · 用户参考机位",
    evidence: "四张用户提供照片",
    status: "多视角实证",
    identity: ["船头圆角塔楼", "连续石材拱廊", "红砖窗格与层叠阳台"],
    challenge: "极长楔形体量需要在网页取景与识别性之间重新压缩尺度。",
    palette: ["#9f523e", "#c8c1ae", "#343936"],
    confidence: { identity: 97, position: 90, scale: 74, orientation: 88 },
  },
  {
    id: "house-315",
    short: "315",
    name: "新华路 315 号住宅",
    address: "新华路 315 号",
    modelPath: "/models/xinhua-road/house-315.glb",
    modelCode: "XH-315",
    targetWidth: 9.4,
    yaw: -0.06,
    canonical: "山墙正面 · B 级近似机位",
    evidence: "道路 + 门牌退界",
    status: "位置推断",
    identity: ["红砖首层", "半木构山墙", "凸窗与陡坡屋顶"],
    challenge: "单张近距离照片容易把透视畸变误当成建筑比例。",
    palette: ["#a75942", "#e5dfd1", "#39433c"],
    confidence: { identity: 94, position: 72, scale: 63, orientation: 81 },
  },
  {
    id: "shanghai-cinema",
    short: "160",
    name: "上海影城",
    address: "新华路 160 号",
    modelPath: "/models/xinhua-road/shanghai-cinema.glb",
    modelCode: "XH-160",
    targetWidth: 12.2,
    yaw: 0.12,
    canonical: "左前三分之四 · A 级机位",
    evidence: "OSM way 292250766",
    status: "轮廓实证",
    identity: ["连续弧形白壳", "环形玻璃首层", "外楼梯与屋顶格栅"],
    challenge: "曲面、玻璃和环形动线不能被普通盒子体块替代。",
    palette: ["#e7e7df", "#7fa1a0", "#4f5b57"],
    confidence: { identity: 96, position: 93, scale: 76, orientation: 88 },
  },
  {
    id: "hudec-memorial",
    short: "129",
    name: "邬达克纪念馆",
    address: "番禺路 129 号",
    modelPath: "/models/requested-pois/hudec-memorial.glb",
    modelCode: "PN-129",
    targetWidth: 10.2,
    yaw: 0.02,
    canonical: "正面偏右 · A 级机位",
    evidence: "OSM way 494633921",
    status: "轮廓实证",
    identity: ["都铎半木构", "双烟囱陡坡屋顶", "三角门廊与砖拱门"],
    challenge: "树木遮挡很重，需要多视角区分真实构件与推断区域。",
    palette: ["#e4e0d3", "#282e2c", "#9b573f"],
    confidence: { identity: 97, position: 95, scale: 79, orientation: 91 },
  },
];

const MODES: Array<{ id: WorkMode; label: string; cn: string; key: string }> = [
  { id: "evidence", label: "Evidence", cn: "证据", key: "E" },
  { id: "massing", label: "Massing", cn: "体块", key: "M" },
  { id: "wonder", label: "Wonder", cn: "风格", key: "W" },
  { id: "wander", label: "Wander", cn: "漫游", key: "R" },
];

const VIEWS: Array<{ id: ViewPreset; label: string; key: string }> = [
  { id: "canonical", label: "主证据机位", key: "1" },
  { id: "quarter", label: "侧向复核", key: "2" },
  { id: "top", label: "Footprint", key: "3" },
  { id: "street", label: "人眼漫游", key: "4" },
];

const STAGES = [
  { label: "Input", cn: "输入" },
  { label: "Read", cn: "读图" },
  { label: "Footprint", cn: "轮廓" },
  { label: "Massing", cn: "体块" },
  { label: "Wonder", cn: "风格" },
  { label: "Validate", cn: "验证" },
];

const DEFAULT_PROFILE = profileFromAnalysis(PRESET_ANALYSES["house-315"]);

function sleep(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function hexNumber(value: string) {
  return Number.parseInt(value.replace("#", ""), 16);
}

function createPitchedRoof(
  width: number,
  depth: number,
  height: number,
  color: string,
) {
  const halfW = width / 2;
  const halfD = depth / 2;
  const positions = new Float32Array([
    -halfW, 0, -halfD, halfW, 0, -halfD, 0, height, -halfD,
    -halfW, 0, halfD, 0, height, halfD, halfW, 0, halfD,
    -halfW, 0, -halfD, -halfW, 0, halfD, halfW, 0, -halfD,
    halfW, 0, halfD, 0, height, -halfD, 0, height, halfD,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([
    0, 1, 2, 3, 4, 5,
    6, 7, 10, 7, 11, 10,
    8, 10, 9, 9, 10, 11,
  ]);
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: hexNumber(color),
      roughness: 0.88,
      metalness: 0,
    }),
  );
}

function createTree(variant: number, x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6d5a43, roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: [0x6f8c70, 0x819679, 0x657f68][variant % 3],
    roughness: 1,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 3.7, 7), trunkMaterial);
  trunk.position.y = 1.85;
  trunk.rotation.z = (variant - 1) * 0.045;
  group.add(trunk);

  const branchPlan = variant === 0
    ? [[-0.38, 3.35, -0.62], [0.42, 3.48, 0.68], [0.02, 3.8, 0.18]]
    : variant === 1
      ? [[-0.26, 3.45, -0.48], [0.55, 3.2, 0.77], [0.2, 3.9, 0.28]]
      : [[-0.52, 3.16, -0.72], [0.27, 3.62, 0.52], [0.1, 3.9, -0.22]];

  branchPlan.forEach(([bx, by, rotation], index) => {
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.12, 1.55 - index * 0.12, 6),
      trunkMaterial,
    );
    branch.position.set(bx * 0.52, by, (index - 1) * 0.15);
    branch.rotation.z = rotation;
    branch.rotation.x = (index - 1) * 0.14;
    group.add(branch);
  });

  const crowns = variant === 0
    ? [[-0.62, 4.3, 0], [0.52, 4.46, 0.08], [0.04, 5.08, -0.08]]
    : variant === 1
      ? [[-0.35, 4.64, 0.12], [0.7, 4.25, -0.1], [0.32, 5.18, 0.06]]
      : [[-0.72, 4.42, -0.04], [0.12, 4.16, 0.18], [0.62, 4.82, -0.12], [-0.08, 5.28, 0]];

  crowns.forEach(([cx, cy, cz], index) => {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.82 + ((variant + index) % 3) * 0.14, 1),
      leafMaterial,
    );
    crown.position.set(cx, cy, cz);
    crown.scale.set(1.08 + index * 0.03, 0.84 + variant * 0.05, 0.94);
    group.add(crown);
  });

  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.rotation.y = variant * 0.72 + x * 0.04;
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function makeLine(
  points: Array<[number, number, number]>,
  color: number,
  dashed = false,
) {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.32, gapSize: 0.2 })
    : new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return line;
}

function disposeGroup(group: THREE.Group) {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) return;
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

function createWonderBuilding(profile: GeneratedProfile) {
  const group = new THREE.Group();
  group.name = "evidence-conditioned-procedural-building";

  const facade = new THREE.MeshStandardMaterial({
    color: hexNumber(profile.facadeColor),
    roughness: 0.92,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: hexNumber(profile.accentColor),
    roughness: 0.9,
  });
  const frame = new THREE.MeshStandardMaterial({ color: 0x34423c, roughness: 0.88 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x89aeb0,
    roughness: 0.34,
    metalness: 0.05,
  });
  const height = profile.floors * 1.42;
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(profile.width, height, profile.depth, 4, 0.12),
    facade,
  );
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const lowerBand = new THREE.Mesh(
    new RoundedBoxGeometry(profile.width + 0.08, 1.25, profile.depth + 0.08, 3, 0.08),
    accent,
  );
  lowerBand.position.y = 0.67;
  lowerBand.castShadow = true;
  group.add(lowerBand);

  const windowWidth = Math.min(0.84, (profile.width - 1.4) / profile.bays * 0.62);
  const spacing = (profile.width - 1.25) / profile.bays;
  for (let floor = 0; floor < profile.floors; floor += 1) {
    for (let bay = 0; bay < profile.bays; bay += 1) {
      if (floor === 0 && bay === Math.floor(profile.bays / 2)) continue;
      const windowGroup = new THREE.Group();
      const windowFrame = new THREE.Mesh(
        new RoundedBoxGeometry(windowWidth + 0.15, 0.9, 0.12, 2, 0.035),
        frame,
      );
      const pane = new THREE.Mesh(
        new RoundedBoxGeometry(windowWidth, 0.74, 0.15, 2, 0.025),
        glass,
      );
      pane.position.z = 0.035;
      windowGroup.add(windowFrame, pane);
      windowGroup.position.set(
        -profile.width / 2 + 0.62 + spacing * (bay + 0.5),
        0.72 + floor * 1.38,
        profile.depth / 2 + 0.085,
      );
      group.add(windowGroup);
    }
  }

  const door = new THREE.Mesh(
    new RoundedBoxGeometry(0.92, 1.55, 0.18, 3, 0.045),
    frame,
  );
  door.position.set(0, 0.82, profile.depth / 2 + 0.12);
  group.add(door);

  const canopy = new THREE.Mesh(
    new RoundedBoxGeometry(1.8, 0.14, 0.8, 3, 0.06),
    accent,
  );
  canopy.position.set(0, 1.66, profile.depth / 2 + 0.36);
  canopy.rotation.x = -0.08;
  group.add(canopy);

  const cornice = new THREE.Mesh(
    new RoundedBoxGeometry(profile.width + 0.26, 0.18, profile.depth + 0.26, 2, 0.05),
    frame,
  );
  cornice.position.y = height + 0.02;
  group.add(cornice);

  if (profile.roofStyle === "flat") {
    const roof = new THREE.Mesh(
      new RoundedBoxGeometry(profile.width + 0.5, 0.32, profile.depth + 0.5, 4, 0.12),
      new THREE.MeshStandardMaterial({ color: hexNumber(profile.roofColor), roughness: 0.9 }),
    );
    roof.position.y = height + 0.24;
    group.add(roof);
    const upperShell = new THREE.Mesh(
      new THREE.TorusGeometry(profile.width * 0.22, 0.16, 8, 38, Math.PI * 1.45),
      facade,
    );
    upperShell.position.set(0.5, height + 0.75, 0.25);
    upperShell.rotation.x = Math.PI / 2;
    upperShell.rotation.z = 0.3;
    group.add(upperShell);
  } else if (profile.roofStyle === "hip") {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(profile.width * 0.72, 2.15, 4),
      new THREE.MeshStandardMaterial({ color: hexNumber(profile.roofColor), roughness: 0.9 }),
    );
    roof.position.y = height + 1.05;
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = profile.depth / profile.width;
    group.add(roof);
  } else {
    const roofHeight = Math.tan(THREE.MathUtils.degToRad(profile.roofPitch)) * profile.width * 0.31;
    const roof = createPitchedRoof(
      profile.width + 0.58,
      profile.depth + 0.62,
      Math.min(3.6, roofHeight),
      profile.roofColor,
    );
    roof.position.y = height + 0.05;
    roof.castShadow = true;
    group.add(roof);

    const beamMaterial = frame;
    const beamY = height - 0.55;
    const horizontal = new THREE.Mesh(
      new THREE.BoxGeometry(profile.width * 0.82, 0.12, 0.14),
      beamMaterial,
    );
    horizontal.position.set(0, beamY, profile.depth / 2 + 0.12);
    group.add(horizontal);
    [-0.32, 0, 0.32].forEach((ratio, index) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.05, 0.14), beamMaterial);
      beam.position.set(profile.width * ratio, beamY - 0.05, profile.depth / 2 + 0.12);
      beam.rotation.z = index === 1 ? 0 : (index === 0 ? -0.32 : 0.32);
      group.add(beam);
    });

    [-profile.width * 0.34, profile.width * 0.34].forEach((x, index) => {
      const chimney = new THREE.Mesh(
        new RoundedBoxGeometry(0.55, 2.35, 0.68, 2, 0.05),
        accent,
      );
      chimney.position.set(x, height + 1.08, index ? -0.8 : 0.76);
      group.add(chimney);
    });
  }

  const hedgeMaterial = new THREE.MeshStandardMaterial({ color: 0x71866b, roughness: 1 });
  for (let index = 0; index < 8; index += 1) {
    const hedge = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), hedgeMaterial);
    hedge.scale.set(1.2, 0.72, 0.84);
    hedge.position.set(-profile.width / 2 + 0.75 + index * (profile.width - 1.5) / 7, 0.28, profile.depth / 2 + 0.8);
    hedge.rotation.y = index * 0.77;
    group.add(hedge);
  }

  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

async function readImageFile(file: File): Promise<UploadedImage> {
  const url = URL.createObjectURL(file);
  try {
    const bitmap = await createImageBitmap(file);
    const sampleWidth = 96;
    const sampleHeight = Math.max(48, Math.round(sampleWidth * bitmap.height / bitmap.width));
    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("浏览器无法读取图像");
    context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight);
    bitmap.close();
    return {
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      url,
      analysis: analyzePixelData(pixels.data, sampleWidth, sampleHeight),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function WonderWorkbench() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const uploadsRef = useRef<UploadedImage[]>([]);
  const [activePoiId, setActivePoiId] = useState<PoiPreset["id"]>("house-315");
  const [mode, setMode] = useState<WorkMode>("wonder");
  const [view, setView] = useState<ViewPreset>("canonical");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    footprint: true,
    rays: true,
    uncertainty: true,
  });
  const [uploads, setUploads] = useState<UploadedImage[]>([]);
  const [analysis, setAnalysis] = useState<ImageAnalysis>(PRESET_ANALYSES["house-315"]);
  const [profile, setProfile] = useState<GeneratedProfile>(DEFAULT_PROFILE);
  const [stageIndex, setStageIndex] = useState(STAGES.length - 1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [assetReady, setAssetReady] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [modelSource, setModelSource] = useState<ModelSource>("preset");

  const activePoi = useMemo(
    () => POIS.find((poi) => poi.id === activePoiId) ?? POIS[0],
    [activePoiId],
  );

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => () => {
    uploadsRef.current.forEach((image) => URL.revokeObjectURL(image.url));
  }, []);

  const setWorkMode = useCallback((nextMode: WorkMode) => {
    setMode(nextMode);
    sceneRef.current?.setMode(nextMode);
    if (nextMode === "wander") {
      setView("street");
      sceneRef.current?.setView("street");
    }
  }, []);

  const setWorkView = useCallback((nextView: ViewPreset) => {
    setView(nextView);
    sceneRef.current?.setView(nextView);
  }, []);

  const applyPreset = useCallback((poi: PoiPreset) => {
    uploadsRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    setUploads([]);
    setUploadError("");
    setActivePoiId(poi.id);
    const presetAnalysis = PRESET_ANALYSES[poi.id];
    const nextProfile = profileFromAnalysis(presetAnalysis);
    setAnalysis(presetAnalysis);
    setProfile(nextProfile);
    setStageIndex(STAGES.length - 1);
    setModelSource("preset");
    setMode("wonder");
    setView("canonical");
    setAssetReady(false);
    sceneRef.current?.setGeneratedProfile(nextProfile, "preset");
    sceneRef.current?.setPreset(poi);
    sceneRef.current?.setMode("wonder");
    sceneRef.current?.setView("canonical");
  }, []);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/")).slice(0, 5);
    if (!files.length) {
      setUploadError("请选择 JPG、PNG、WebP 或 HEIC 图像。");
      return;
    }
    setUploadError("");
    setIsReading(true);
    try {
      const nextUploads = await Promise.all(files.map(readImageFile));
      uploadsRef.current.forEach((image) => URL.revokeObjectURL(image.url));
      const merged = mergeImageAnalyses(nextUploads.map((image) => image.analysis));
      const nextProfile = profileFromAnalysis(merged);
      setUploads(nextUploads);
      setAnalysis(merged);
      setProfile(nextProfile);
      setStageIndex(1);
      setModelSource("generated");
      sceneRef.current?.setGeneratedProfile(nextProfile, "generated");
      setWorkMode("evidence");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "读取图片失败，请换一张重试。");
    } finally {
      setIsReading(false);
    }
  }, [setWorkMode]);

  const runPipeline = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setUploadError("");
    const nextProfile = profileFromAnalysis(analysis);
    setProfile(nextProfile);
    setModelSource("generated");
    setStageIndex(0);
    setWorkMode("evidence");
    await sleep(380);
    setStageIndex(1);
    await sleep(520);
    setStageIndex(2);
    await sleep(500);
    sceneRef.current?.setGeneratedProfile(nextProfile, "generated");
    setStageIndex(3);
    setWorkMode("massing");
    await sleep(680);
    setStageIndex(4);
    setWorkMode("wonder");
    await sleep(760);
    setStageIndex(5);
    setWorkView("canonical");
    setIsGenerating(false);
  }, [analysis, isGenerating, setWorkMode, setWorkView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
      const key = event.key.toLowerCase();
      if (key === "e") setWorkMode("evidence");
      if (key === "m") setWorkMode("massing");
      if (key === "w") setWorkMode("wonder");
      if (key === "r") setWorkMode("wander");
      if (key === "1") setWorkView("canonical");
      if (key === "2") setWorkView("quarter");
      if (key === "3") setWorkView("top");
      if (key === "4") setWorkView("street");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setWorkMode, setWorkView]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc9dde0);
    scene.fog = new THREE.Fog(0xc9dde0, 24, 48);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    camera.position.set(12.6, 7.2, 15.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 2.25, 0);
    controls.minDistance = 5;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.enablePan = false;

    scene.add(new THREE.HemisphereLight(0xfff7e8, 0x65786c, 2.4));
    const keyLight = new THREE.DirectionalLight(0xfff1ce, 3.4);
    keyLight.position.set(-8, 15, 11);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1536, 1536);
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9fc2c0, 1.3);
    rimLight.position.set(10, 8, -12);
    scene.add(rimLight);

    const environment = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(13.8, 14.4, 0.72, 64),
      new THREE.MeshStandardMaterial({ color: 0xb5c49f, roughness: 1 }),
    );
    base.position.y = -0.38;
    base.scale.z = 0.78;
    base.receiveShadow = true;
    environment.add(base);

    const sidewalk = new THREE.Mesh(
      new RoundedBoxGeometry(28, 0.16, 3.8, 4, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xd7ceb9, roughness: 0.98 }),
    );
    sidewalk.position.set(0, 0.06, 6.3);
    sidewalk.receiveShadow = true;
    environment.add(sidewalk);

    const road = new THREE.Mesh(
      new RoundedBoxGeometry(28, 0.12, 5.2, 4, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x505953, roughness: 0.98 }),
    );
    road.position.set(0, 0.035, 10.15);
    road.receiveShadow = true;
    environment.add(road);

    const roadDashMaterial = new THREE.MeshStandardMaterial({ color: 0xd9cfb2, roughness: 1 });
    for (let x = -11; x <= 11; x += 4.4) {
      const dash = new THREE.Mesh(new RoundedBoxGeometry(2, 0.025, 0.12, 2, 0.04), roadDashMaterial);
      dash.position.set(x, 0.12, 10.15);
      environment.add(dash);
    }

    environment.add(createTree(0, -9.2, 5.45, 1.03));
    environment.add(createTree(1, 8.5, 5.55, 0.98));
    environment.add(createTree(2, -10.6, -1.8, 0.86));
    environment.add(createTree(1, 10.4, -1.2, 0.78));

    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0x415149, roughness: 0.86 });
    [-5.8, 5.8].forEach((x) => {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 2.7, 7), lampMaterial);
      pole.position.y = 1.35;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.42, 6), lampMaterial);
      cap.position.y = 2.76;
      cap.rotation.z = Math.PI;
      lamp.add(pole, cap);
      lamp.position.set(x, 0, 6.1);
      environment.add(lamp);
    });
    scene.add(environment);

    const actualRoot = new THREE.Group();
    const generatedRoot = new THREE.Group();
    scene.add(actualRoot, generatedRoot);
    let activeActual: THREE.Group | null = null;
    let activeGenerated = createWonderBuilding(DEFAULT_PROFILE);
    generatedRoot.add(activeGenerated);
    let currentMode: WorkMode = "wonder";
    let currentSource: ModelSource = "preset";
    let loadToken = 0;
    let actualOriginalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    let generatedOriginalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

    const snapshotMaterials = (root: THREE.Group) => {
      const map = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const value = Array.isArray(object.material)
          ? object.material.map((material) => material.clone())
          : object.material.clone();
        map.set(object, value);
        object.castShadow = true;
        object.receiveShadow = true;
      });
      return map;
    };
    generatedOriginalMaterials = snapshotMaterials(activeGenerated);

    const footprint = new THREE.Group();
    const footprintPoints: Array<[number, number, number]> = [
      [-5.8, 0.16, -4.2], [5.8, 0.16, -4.2], [5.8, 0.16, 4.25],
      [-5.8, 0.16, 4.25], [-5.8, 0.16, -4.2],
    ];
    footprint.add(makeLine(footprintPoints, 0x4f9fa2, true));
    const anchor = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.34, 28),
      new THREE.MeshBasicMaterial({ color: 0xaa5a43, side: THREE.DoubleSide }),
    );
    anchor.rotation.x = -Math.PI / 2;
    anchor.position.set(-0.16, 0.17, 0.12);
    footprint.add(anchor);
    scene.add(footprint);

    const rays = new THREE.Group();
    const cameraOrigins: Array<{ point: [number, number, number]; color: number }> = [
      { point: [-8.6, 1.6, 12.5], color: 0xa8553e },
      { point: [10.2, 1.75, 9.4], color: 0xd1a052 },
    ];
    cameraOrigins.forEach(({ point, color }) => {
      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.72, 4),
        new THREE.MeshBasicMaterial({ color }),
      );
      marker.position.set(...point);
      marker.rotation.x = -Math.PI / 2;
      rays.add(marker);
      rays.add(makeLine([point, [-4.1, 0.4, 3.8], point, [4.1, 0.4, 3.8]], color));
    });
    scene.add(rays);

    const uncertainty = new THREE.Group();
    const inferredVolume = createPitchedRoof(7.8, 6.2, 2.4, "#d0a04d");
    inferredVolume.material.transparent = true;
    inferredVolume.material.opacity = 0.2;
    inferredVolume.material.depthWrite = false;
    inferredVolume.position.y = 4.7;
    uncertainty.add(inferredVolume);
    const rearPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(8.4, 3.8),
      new THREE.MeshBasicMaterial({
        color: 0xd0a04d,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    rearPlane.position.set(0, 2.2, -3.9);
    uncertainty.add(rearPlane);
    scene.add(uncertainty);

    const applyMaterialMode = (
      originals: Map<THREE.Mesh, THREE.Material | THREE.Material[]>,
      materialMode: "original" | "clay" | "wire",
    ) => {
      originals.forEach((original, mesh) => {
        if (materialMode === "original") {
          mesh.material = Array.isArray(original)
            ? original.map((material) => material.clone())
            : original.clone();
          return;
        }
        const source = Array.isArray(original) ? original : [original];
        mesh.material = source.map(() => (
          materialMode === "wire"
            ? new THREE.MeshBasicMaterial({
              color: 0x52685c,
              wireframe: true,
              transparent: true,
              opacity: 0.76,
            })
            : new THREE.MeshStandardMaterial({
              color: 0xded6c5,
              roughness: 0.98,
              transparent: true,
              opacity: 0.88,
            })
        ));
      });
    };

    const applyMode = (nextMode: WorkMode) => {
      currentMode = nextMode;
      const showingGenerated = nextMode === "massing" || currentSource === "generated";
      actualRoot.visible = !showingGenerated;
      generatedRoot.visible = showingGenerated;
      environment.visible = nextMode !== "massing";
      footprint.visible = layers.footprint && nextMode !== "wander";
      rays.visible = layers.rays && nextMode === "evidence";
      uncertainty.visible = layers.uncertainty && nextMode === "evidence";
      scene.background = new THREE.Color(nextMode === "massing" ? 0xe9e1d2 : 0xc9dde0);
      scene.fog = new THREE.Fog(nextMode === "massing" ? 0xe9e1d2 : 0xc9dde0, 24, 48);
      applyMaterialMode(actualOriginalMaterials, nextMode === "evidence" ? "clay" : "original");
      applyMaterialMode(
        generatedOriginalMaterials,
        nextMode === "massing" ? "wire" : nextMode === "evidence" ? "clay" : "original",
      );
      controls.enableRotate = nextMode !== "wander" || view !== "top";
    };

    const setViewPreset = (nextView: ViewPreset) => {
      const presets: Record<ViewPreset, {
        position: [number, number, number];
        target: [number, number, number];
      }> = {
        canonical: { position: [11.8, 6.5, 15.8], target: [0, 2.35, 0] },
        quarter: { position: [-13.8, 7.4, 13.1], target: [0, 2.2, 0.2] },
        top: { position: [0.01, 24, 0.01], target: [0, 0, 0] },
        street: { position: [10.8, 1.78, 18.2], target: [0, 1.7, 0.8] },
      };
      const preset = presets[nextView];
      camera.position.set(...preset.position);
      controls.target.set(...preset.target);
      controls.minDistance = nextView === "street" ? 0.6 : 5;
      controls.maxDistance = nextView === "street" ? 26 : 32;
      controls.enablePan = false;
      controls.update();
    };

    const loader = new GLTFLoader();
    const setPreset = (preset: PoiPreset) => {
      const token = ++loadToken;
      setAssetReady(false);
      loader.load(
        preset.modelPath,
        (gltf) => {
          if (token !== loadToken) {
            disposeGroup(gltf.scene);
            return;
          }
          if (activeActual) {
            actualRoot.remove(activeActual);
            disposeGroup(activeActual);
          }
          activeActual = gltf.scene;
          activeActual.scale.z = -1;
          // 三个来源资产都以 Blender local -Y 为正面；统一转到工作台的 +Z 街道侧。
          activeActual.rotation.y = preset.yaw + Math.PI;
          activeActual.updateMatrixWorld(true);
          let box = new THREE.Box3().setFromObject(activeActual);
          const center = box.getCenter(new THREE.Vector3());
          activeActual.position.x -= center.x;
          activeActual.position.z -= center.z;
          activeActual.position.y -= box.min.y;
          activeActual.updateMatrixWorld(true);
          box = new THREE.Box3().setFromObject(activeActual);
          const modelWidth = Math.max(0.01, box.max.x - box.min.x);
          activeActual.scale.multiplyScalar(preset.targetWidth / modelWidth);
          activeActual.updateMatrixWorld(true);
          box = new THREE.Box3().setFromObject(activeActual);
          const recentered = box.getCenter(new THREE.Vector3());
          activeActual.position.x -= recentered.x;
          activeActual.position.z -= recentered.z;
          activeActual.position.y -= box.min.y;
          actualRoot.add(activeActual);
          actualOriginalMaterials = snapshotMaterials(activeActual);
          currentSource = "preset";
          applyMode(currentMode);
          setAssetReady(true);
        },
        undefined,
        () => {
          if (token === loadToken) setAssetReady(false);
        },
      );
    };

    const setGeneratedProfile = (nextProfile: GeneratedProfile, source: ModelSource) => {
      currentSource = source;
      generatedRoot.remove(activeGenerated);
      disposeGroup(activeGenerated);
      activeGenerated = createWonderBuilding(nextProfile);
      generatedRoot.add(activeGenerated);
      generatedOriginalMaterials = snapshotMaterials(activeGenerated);
      applyMode(currentMode);
    };

    sceneRef.current = {
      setMode: applyMode,
      setView: setViewPreset,
      setPreset,
      setGeneratedProfile,
      setLayer: (key, visible) => {
        if (key === "footprint") footprint.visible = visible && currentMode !== "wander";
        if (key === "rays") rays.visible = visible && currentMode === "evidence";
        if (key === "uncertainty") uncertainty.visible = visible && currentMode === "evidence";
      },
    };
    setPreset(POIS[0]);
    applyMode("wonder");
    setViewPreset("canonical");

    const pressedKeys = new Set<string>();
    const onSceneKeyDown = (event: KeyboardEvent) => pressedKeys.add(event.key.toLowerCase());
    const onSceneKeyUp = (event: KeyboardEvent) => pressedKeys.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onSceneKeyDown);
    window.addEventListener("keyup", onSceneKeyUp);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    resize();

    let lastFrameTime = window.performance.now();
    let animationFrame = 0;
    const render = () => {
      animationFrame = window.requestAnimationFrame(render);
      const frameTime = window.performance.now();
      const delta = Math.min((frameTime - lastFrameTime) / 1000, 0.04);
      lastFrameTime = frameTime;
      if (currentMode === "wander") {
        const forward = new THREE.Vector3()
          .subVectors(controls.target, camera.position)
          .setY(0)
          .normalize();
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        const movement = new THREE.Vector3();
        if (pressedKeys.has("w") || pressedKeys.has("arrowup")) movement.add(forward);
        if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) movement.sub(forward);
        if (pressedKeys.has("d") || pressedKeys.has("arrowright")) movement.add(right);
        if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) movement.sub(right);
        if (movement.lengthSq() > 0) {
          movement.normalize().multiplyScalar(delta * 4.1);
          const next = camera.position.clone().add(movement);
          const insideBuilding = Math.abs(next.x) < 5.8 && next.z > -4.2 && next.z < 4.5;
          if (!insideBuilding && Math.abs(next.x) < 13 && Math.abs(next.z) < 13) {
            camera.position.add(movement);
            controls.target.add(movement);
          }
        }
        camera.position.y = 1.78;
        controls.target.y = 1.7;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onSceneKeyDown);
      window.removeEventListener("keyup", onSceneKeyUp);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      sceneRef.current = null;
    };
  // This effect owns the Three.js scene lifecycle. UI state is forwarded
  // through sceneRef methods so a view/layer change must not rebuild WebGL.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (Object.keys(layers) as LayerKey[]).forEach((key) => {
      sceneRef.current?.setLayer(key, layers[key]);
    });
  }, [layers, mode]);

  const confidence = modelSource === "preset"
    ? activePoi.confidence
    : {
      identity: Math.max(42, profile.confidence - 18),
      position: 0,
      scale: Math.max(28, profile.confidence - 26),
      orientation: Math.max(35, profile.confidence - 18),
    };

  const stageMessage = isGenerating
    ? `${STAGES[stageIndex].label} · ${STAGES[stageIndex].cn}处理中`
    : stageIndex === STAGES.length - 1
      ? "链路已完成，可切换四种观察模式"
      : "图片已在本机读取，等待生成";

  return (
    <main className={`ww-shell ww-mode-${mode}`}>
      <header className="ww-header">
        <a className="ww-brand" href="#workbench" aria-label="返回新华 Wonder 工作台">
          <span className="ww-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>
            <b>新华 WONDER</b>
            <small>PHOTO-TO-PLACE WORKBENCH</small>
          </span>
        </a>
        <p className="ww-thesis">
          不是把照片“变成一个模型”，而是把<span>证据、比例与不确定性</span>一起变成可漫游的地方。
        </p>
        <a
          className="ww-local-badge"
          href="/building-evidence-lab/plane-tree"
          aria-label="查看 Hero 梧桐树；图片只在本机浏览器处理"
        >
          <i />
          查看 Hero 级 3D 梧桐树 →
        </a>
      </header>

      <section className="ww-hero" id="workbench">
        <div className="ww-intro">
          <div>
            <p className="ww-kicker">INTERACTIVE PROTOTYPE · 02</p>
            <h1>从一组照片，<br />长出一栋<span>可信的建筑。</span></h1>
          </div>
          <p>
            上传你自己的建筑照片，现场体验浏览器如何读取色彩、边缘和上下部关系，
            生成可解释的体块，再进入适合《新华漫游志》的 Wonder 风格。
          </p>
        </div>

        <div className="ww-stage-ribbon" aria-label="图片到三维模型的处理阶段">
          {STAGES.map((stage, index) => (
            <div
              key={stage.label}
              className={`${index < stageIndex ? "is-done" : ""} ${index === stageIndex ? "is-active" : ""}`}
            >
              <span>{index < stageIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <p><b>{stage.label}</b><small>{stage.cn}</small></p>
            </div>
          ))}
          <output aria-live="polite">{stageMessage}</output>
        </div>

        <div className="ww-workbench">
          <aside className="ww-input-rail">
            <div className="ww-rail-heading">
              <p className="ww-kicker">01 / INPUT EVIDENCE</p>
              <h2>给模型看什么？</h2>
              <span>最多 5 张 · JPG / PNG / WebP / HEIC</span>
            </div>

            <div
              className={`ww-dropzone ${isDragging ? "is-dragging" : ""} ${uploads.length ? "has-files" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void processFiles(event.dataTransfer.files);
              }}
              data-testid="upload-dropzone"
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={(event) => {
                  if (event.target.files) void processFiles(event.target.files);
                  event.target.value = "";
                }}
                aria-label="上传建筑参考图片"
                data-testid="photo-input"
              />
              {uploads.length ? (
                <div className="ww-upload-grid">
                  {uploads.map((image, index) => (
                    <figure key={image.id}>
                      {/* 这里显示的是用户刚刚选择的本机文件，不会上传到服务器。 */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={`本机参考图 ${index + 1}：${image.name}`} />
                      <figcaption>REF-{String.fromCharCode(65 + index)}</figcaption>
                    </figure>
                  ))}
                  <button type="button" onClick={() => inputRef.current?.click()}>
                    + 补充视角
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => inputRef.current?.click()}>
                  <span className="ww-upload-glyph" aria-hidden="true"><i /><i /><i /></span>
                  <b>{isReading ? "正在读取像素…" : "拖入照片或点击选择"}</b>
                  <small>正面 + 侧面 + 尺度参照更可靠</small>
                </button>
              )}
            </div>

            {uploadError && <p className="ww-upload-error" role="alert">{uploadError}</p>}

            <div className="ww-input-quality">
              <p><span>视角覆盖</span><b>{uploads.length ? `${Math.min(3, uploads.length)} / 3` : "示例证据"}</b></p>
              <div className="ww-quality-track"><i style={{ width: `${uploads.length ? Math.min(100, uploads.length * 34) : 68}%` }} /></div>
              <ul>
                <li className={uploads.length > 0 ? "is-ready" : ""}>主立面</li>
                <li className={uploads.length > 1 ? "is-ready" : ""}>侧向复核</li>
                <li className={uploads.length > 2 ? "is-ready" : ""}>尺度参照</li>
              </ul>
            </div>

            <button
              type="button"
              className="ww-generate-button"
              onClick={() => void runPipeline()}
              disabled={isGenerating || isReading}
              data-testid="generate-model"
            >
              <span>{isGenerating ? "正在生长模型" : uploads.length ? "从这些照片生成" : "用当前 POI 演示生成"}</span>
              <i aria-hidden="true">→</i>
            </button>
            <p className="ww-honesty">
              <i /> 本 Demo 是 <b>evidence-conditioned procedural blockout</b>，
              不是摄影测量，也不会伪造看不见的背立面。
            </p>
          </aside>

          <section className="ww-viewer" aria-label="可交互 Three.js 新华 Wonder 三维场景">
            <canvas ref={canvasRef} data-testid="three-canvas" />
            <div className="ww-viewer-wash" />

            <div className="ww-viewer-top">
              <div>
                <span className={`ww-live-dot ${assetReady ? "is-ready" : ""}`} />
                <p><small>LIVE THREE.JS SCENE</small><b>{modelSource === "preset" ? activePoi.name : "本机图片生成体块"}</b></p>
              </div>
              <span className="ww-source-chip">{modelSource === "preset" ? "AUTHORED POI" : "LOCAL GENERATION"}</span>
            </div>

            <nav className="ww-mode-switcher" aria-label="三维观察模式">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={mode === item.id ? "is-active" : ""}
                  onClick={() => setWorkMode(item.id)}
                  aria-pressed={mode === item.id}
                  data-testid={`mode-${item.id}`}
                >
                  <kbd>{item.key}</kbd>
                  <span><b>{item.label}</b><small>{item.cn}</small></span>
                </button>
              ))}
            </nav>

            <div className={`ww-scene-tag ww-tag-camera ${mode === "evidence" ? "" : "is-hidden"}`}>
              <i /> REF-A · {activePoi.canonical}
            </div>
            <div className={`ww-scene-tag ww-tag-footprint ${mode === "evidence" ? "" : "is-hidden"}`}>
              <i /> FOOTPRINT · {activePoi.evidence}
            </div>
            <div className={`ww-scene-tag ww-tag-inference ${mode === "evidence" ? "" : "is-hidden"}`}>
              <i /> 后立面 / 屋顶高度 · 推断
            </div>

            <div className="ww-view-controls">
              {VIEWS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={view === item.id ? "is-active" : ""}
                  onClick={() => setWorkView(item.id)}
                  aria-pressed={view === item.id}
                >
                  <kbd>{item.key}</kbd>{item.label}
                </button>
              ))}
            </div>

            <div className="ww-viewer-footer">
              <div className="ww-scale">
                <i /><i /><i /><i />
                <span>0</span><span>5</span><span>10 m</span>
              </div>
              <p>
                {mode === "wander"
                  ? "WASD / 方向键移动 · 拖动转向"
                  : "拖动旋转 · 滚轮缩放 · 1–4 切换机位"}
              </p>
            </div>
          </section>

          <aside className="ww-analysis-rail">
            <div className="ww-analysis-heading">
              <div>
                <p className="ww-kicker">02 / MODEL DNA</p>
                <h2>图像读出了什么？</h2>
              </div>
              <span>{Math.round(profile.confidence)}%</span>
            </div>

            <div className="ww-palette">
              <span style={{ background: profile.facadeColor }} />
              <span style={{ background: profile.accentColor }} />
              <span style={{ background: profile.roofColor }} />
              <p><b>Wonder palette</b><small>从图片取样后向街区色盘收敛</small></p>
            </div>

            <div className="ww-dna-grid">
              <div><small>FLOORS</small><b>{profile.floors}</b><span>层</span></div>
              <div><small>BAYS</small><b>{profile.bays}</b><span>开间</span></div>
              <div><small>ROOF</small><b>{profile.roofPitch}°</b><span>{profile.roofStyle}</span></div>
              <div><small>FORM</small><b>{profile.width}</b><span>× {profile.depth}</span></div>
            </div>

            <div className="ww-signal-list">
              <div>
                <p><span>边缘密度</span><b>{Math.round(analysis.edgeDensity * 100)}%</b></p>
                <i><b style={{ width: `${Math.min(100, analysis.edgeDensity * 300)}%` }} /></i>
              </div>
              <div>
                <p><span>上下部反差</span><b>{Math.round(analysis.upperContrast * 100)}%</b></p>
                <i><b style={{ width: `${analysis.upperContrast * 100}%` }} /></i>
              </div>
              <div>
                <p><span>画面明度</span><b>{analysis.brightness} / 255</b></p>
                <i><b style={{ width: `${analysis.brightness / 2.55}%` }} /></i>
              </div>
            </div>

            <div className="ww-confidence">
              <p className="ww-kicker">INDEPENDENT CONFIDENCE</p>
              {[
                ["Identity", "身份", confidence.identity],
                ["Position", "位置", confidence.position],
                ["Scale", "比例", confidence.scale],
                ["Orientation", "朝向", confidence.orientation],
              ].map(([label, cn, score]) => (
                <div key={String(label)}>
                  <p><b>{label}</b><span>{cn}</span><strong>{Number(score) ? `${score}%` : "N/A"}</strong></p>
                  <i><b className={Number(score) > 80 ? "verified" : Number(score) > 0 ? "inferred" : "pending"} style={{ width: `${score}%` }} /></i>
                </div>
              ))}
            </div>

            <div className="ww-layer-toggles">
              {(Object.keys(layers) as LayerKey[]).map((key) => (
                <button
                  type="button"
                  key={key}
                  className={layers[key] ? "is-on" : ""}
                  onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}
                  aria-pressed={layers[key]}
                >
                  <i><b /></i>
                  <span>{key === "footprint" ? "地图轮廓" : key === "rays" ? "照片射线" : "推断区域"}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>

        <section className="ww-poi-drawer" aria-label="真实 POI 演示案例">
          <div className="ww-poi-intro">
            <p className="ww-kicker">REAL POI CASES</p>
            <h2>用四种真实难题，检验同一条链路。</h2>
            <p>参考照片只留在研究档案中，不进入 GLB，也不作为网页纹理。</p>
          </div>
          <div className="ww-poi-list">
            {POIS.map((poi) => (
              <button
                type="button"
                key={poi.id}
                className={activePoiId === poi.id && modelSource === "preset" ? "is-active" : ""}
                onClick={() => applyPreset(poi)}
                aria-pressed={activePoiId === poi.id && modelSource === "preset"}
                data-testid={`poi-${poi.id}`}
              >
                <span className={`ww-poi-icon icon-${poi.id}`} aria-hidden="true"><i /><i /><i /></span>
                <p><small>{poi.modelCode} · {poi.address}</small><b>{poi.name}</b><span>{poi.challenge}</span></p>
                <em>{activePoiId === poi.id && modelSource === "preset" ? "正在查看" : "载入案例"} →</em>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="ww-method">
        <div className="ww-method-lead">
          <p className="ww-kicker">WHY “WONDER”</p>
          <h2>照片越少，越需要一种<br />对不确定性<span>诚实又好看</span>的风格。</h2>
          <p>
            新版“新华 Wonder”不是把低精度藏起来，而是把可信的大轮廓做得鲜明，
            把缺证据的部分做得克制，让用户一眼能认出地方，也能继续追问模型为何成立。
          </p>
        </div>

        <div className="ww-method-grid">
          <article>
            <span>01</span>
            <p className="ww-kicker">METER FIRST</p>
            <h3>先把米制与位置分开</h3>
            <p><code>sceneScale = 1 / 2.7 × visualScale</code></p>
            <small>视觉放大不能冒充真实尺寸；地址点也不能直接冒充建筑中心。</small>
          </article>
          <article>
            <span>02</span>
            <p className="ww-kicker">READABLE SILHOUETTE</p>
            <h3>远处先认出“它是谁”</h3>
            <ul>
              {activePoi.identity.map((cue) => <li key={cue}>{cue}</li>)}
            </ul>
            <small>每个地标至少保留三处专属识别点，不能只换墙色和屋顶色。</small>
          </article>
          <article>
            <span>03</span>
            <p className="ww-kicker">VISIBLE UNCERTAINTY</p>
            <h3>不把推断涂成事实</h3>
            <div className="ww-evidence-legend">
              <i className="verified" /> 实证
              <i className="inferred" /> 推断
              <i className="pending" /> 待补证
            </div>
            <small>Identity、Position、Scale、Orientation 分开评级，避免一个模糊总分。</small>
          </article>
          <article>
            <span>04</span>
            <p className="ww-kicker">RUNTIME VALIDATION</p>
            <h3>从照片视角走进场景</h3>
            <p className="ww-validation-route">主照片 → 侧向复核 → 地图顶视 → 人眼漫游</p>
            <small>Blender 里看着对，不等于放进 Three.js 后比例、遮挡和相机都对。</small>
          </article>
        </div>
      </section>

      <footer className="ww-footer">
        <div>
          <p className="ww-kicker">XINHUA WONDER · RESEARCH PROTOTYPE</p>
          <h2>让每栋建筑，都能解释自己从哪里来。</h2>
        </div>
        <p>
          真实 POI 资产：GLB + Blend + 确定性生成脚本<br />
          照片上传：只在本机浏览器内读取，不发送、不保存
        </p>
      </footer>
    </main>
  );
}
