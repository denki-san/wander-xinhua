export const PLANE_TREE_SPATIAL_CELL_SIZE = 32;
export const PLANE_TREE_IDENTITY_ENTER_DISTANCE = 37;
export const PLANE_TREE_IDENTITY_EXIT_DISTANCE = 42;
export const PLANE_TREE_MASSING_ENTER_DISTANCE = 75;
export const PLANE_TREE_MASSING_EXIT_DISTANCE = 82;
export const PLANE_TREE_IDENTITY_ACTIVE_LIMIT = 80;
export const PLANE_TREE_MASSING_ACTIVE_LIMIT = 140;

function cellCoordinate(value, cellSize) {
  return Math.floor(value / cellSize);
}

function cellKey(x, z) {
  return `${x}:${z}`;
}

/** 建立确定性二维网格；只有玩家跨单元或 LOD 迟滞边界时才需重算激活集合。 */
export function buildPlaneTreeSpatialIndex(
  placements,
  cellSize = PLANE_TREE_SPATIAL_CELL_SIZE,
) {
  const cells = new Map();
  for (const placement of placements) {
    const position = placement.position;
    const x = position[0];
    const z = position.length >= 3 ? position[2] : position[1];
    const key = cellKey(
      cellCoordinate(x, cellSize),
      cellCoordinate(z, cellSize),
    );
    const current = cells.get(key) ?? [];
    current.push(placement);
    cells.set(key, current);
  }
  return Object.freeze({
    cellSize,
    placements: Object.freeze([...placements]),
    cells,
  });
}

export function planeTreeSpatialCell(
  focusPosition,
  cellSize = PLANE_TREE_SPATIAL_CELL_SIZE,
) {
  return [
    cellCoordinate(focusPosition[0], cellSize),
    cellCoordinate(focusPosition[1], cellSize),
  ];
}

/** 只返回给定半径覆盖的网格候选，并按真实平面距离排序。 */
export function queryPlaneTreeSpatialIndex(index, focusPosition, radius) {
  const [focusX, focusZ] = focusPosition;
  const minimumCellX = cellCoordinate(focusX - radius, index.cellSize);
  const maximumCellX = cellCoordinate(focusX + radius, index.cellSize);
  const minimumCellZ = cellCoordinate(focusZ - radius, index.cellSize);
  const maximumCellZ = cellCoordinate(focusZ + radius, index.cellSize);
  const matches = [];
  for (let cellX = minimumCellX; cellX <= maximumCellX; cellX += 1) {
    for (let cellZ = minimumCellZ; cellZ <= maximumCellZ; cellZ += 1) {
      for (const placement of index.cells.get(cellKey(cellX, cellZ)) ?? []) {
        const position = placement.position;
        const x = position[0];
        const z = position.length >= 3 ? position[2] : position[1];
        const distance = Math.hypot(x - focusX, z - focusZ);
        if (distance <= radius) matches.push({ placement, distance });
      }
    }
  }
  return matches.sort(
    (left, right) => (
      left.distance - right.distance
      || left.placement.id.localeCompare(right.placement.id)
    ),
  );
}

function withinHysteresisDistance(match, previousIds, enter, exit) {
  return match.distance <= (
    previousIds.has(match.placement.id) ? exit : enter
  );
}

/**
 * Overview 显示全量 Massing；弱网漫游最多 140 个 Massing；标准漫游最多
 * 80 个 Identity 和 140 个中景 Massing。新进入与退出使用不同距离，避免边界抖动。
 */
export function resolvePlaneTreeActiveSets({
  index,
  focusPosition,
  loadMode,
  networkProfile,
  previous = { identityIds: new Set(), massingIds: new Set() },
}) {
  if (loadMode === "overview") {
    return {
      identity: [],
      massing: [...index.placements],
      identityIds: new Set(),
      massingIds: new Set(index.placements.map(({ id }) => id)),
    };
  }

  const nearby = queryPlaneTreeSpatialIndex(
    index,
    focusPosition,
    PLANE_TREE_MASSING_EXIT_DISTANCE,
  );
  if (networkProfile === "weak") {
    const massing = nearby
      .filter((match) => withinHysteresisDistance(
        match,
        previous.massingIds,
        PLANE_TREE_MASSING_ENTER_DISTANCE,
        PLANE_TREE_MASSING_EXIT_DISTANCE,
      ))
      .slice(0, PLANE_TREE_MASSING_ACTIVE_LIMIT)
      .map(({ placement }) => placement);
    return {
      identity: [],
      massing,
      identityIds: new Set(),
      massingIds: new Set(massing.map(({ id }) => id)),
    };
  }

  const identity = nearby
    .filter((match) => withinHysteresisDistance(
      match,
      previous.identityIds,
      PLANE_TREE_IDENTITY_ENTER_DISTANCE,
      PLANE_TREE_IDENTITY_EXIT_DISTANCE,
    ))
    .slice(0, PLANE_TREE_IDENTITY_ACTIVE_LIMIT)
    .map(({ placement }) => placement);
  const identityIds = new Set(identity.map(({ id }) => id));
  const massing = nearby
    .filter(({ placement }) => !identityIds.has(placement.id))
    .filter((match) => withinHysteresisDistance(
      match,
      previous.massingIds,
      PLANE_TREE_MASSING_ENTER_DISTANCE,
      PLANE_TREE_MASSING_EXIT_DISTANCE,
    ))
    .slice(0, PLANE_TREE_MASSING_ACTIVE_LIMIT)
    .map(({ placement }) => placement);
  return {
    identity,
    massing,
    identityIds,
    massingIds: new Set(massing.map(({ id }) => id)),
  };
}
