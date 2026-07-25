3D-GloBFP 
======================================

This dataset provides global building footprints with height in attribute table in shapefile format.
The data are organized by spatial grid, and each file is named according to a standardized pattern that indicates its grid location and geographic coverage.

----------------------------------------
1. File Naming Convention
----------------------------------------

Each file is named as:

    gridID_lon1_lat1_lon2_lat2_region1_region2.shp

Where:
- `gridID`: Unique ID for the grid (see section 2 for details).
- `lon1_lat1_lon2_lat2`: Represents the bounding coordinates of the grid, with:
    - `lon1`, `lat1`: Lower-left (southwest) corner 
    - `lon2`, `lat2`: Upper-right (northeast) corner
- `region1`, `region2`: Abbreviations for countries or areas the grid intersects. 

**Example:**
	985_-2.5_42.5_-1.25_43.75_FR_SP.shp 
	→ Grid 985, covering buildings in the region (-2.5°E to -1.25°E, 42.5°N to 43.75°N) across France and Spain.

**Special Cases: China and USA**
For grids involving **China** or the **USA**, the files are organized by **province** or **state**, respectively. 
The naming uses the full province/state name followed by `CN` (for China) or `US`.

----------------------------------------
2. Grid ID Generation
----------------------------------------

Each file’s grid_ID is derived from the corresponding field in world_grid.shp.
The global grids in world_grid.shp are divided based on a hierarchical subdivision strategy.

----------------------------------------
3. Data Source and Citation
----------------------------------------

The data is detailed in the following article:

**Citation:**
Che Yangzi, Li Xuecao, Liu Xiaoping, Wang Yuhao, Liao Weilin, Zheng Xianwei, Zhang Xucai, Xu Xiaocong, Shi Qian, Zhu Jiajun, Zhang Honghui, Yuan Hua, & Dai Yongjiu (2024). 3D-GloBFP: the first global three-dimensional building footprint dataset. Earth Syst. Sci. Data, 16, 5357-5374

For questions or further assistance, please contact cheyz@mail2.sysu.cn


