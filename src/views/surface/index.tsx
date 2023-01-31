import deepEqual from "fast-deep-equal";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as qs from "qs";

import FingerprintPane from "components/pane/fingerprint";
import KeyDialog from "./keyDialog";
import SurfaceControls from "./surfaceControls";
import SurfacePane, { SurfacePaneState } from "./surfacePane";
import {
  ContrastLabel,
  Orientation,
  modulo,
  usePrevious,
  MeshType,
  HemisphereSide,
} from "constants/index";
import { server } from "App";

interface DatasetInfo {
  subjects: string[];
  mesh_supports: string[];
  mesh_types?: string[];
  hemis: string[];
  tasks_contrasts: string[][];
  n_files: number;
}

interface SurfaceViewProps {
  datasetId: string;
}

interface SurfaceViewState {
  selectedTasks?: string[];
  panes: { [paneId: string]: SurfacePaneState };
}

const stateFromUrl = (): SurfaceViewState => {
  // Load state from URL and convert it to SurfaceViewState
  // (decode booleans and numbers with custom decoder)
  let urlState = qs.parse(window.location.search, {
    ignoreQueryPrefix: true,
    // qs turns arrays which are too long into dictionaries
    // for performance purposes ; we disable this feature here
    arrayLimit: 1000,
    decoder(str, _, charset) {
      const strWithoutPlus: any = str.replace(/\+/g, " ");
      if (charset === "iso-8859-1") {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, _);
      }

      if (/^(\d+|\d*\.\d+)$/.test(str)) {
        return parseFloat(str);
      }

      const keywords = {
        true: true,
        false: false,
        null: null,
        undefined,
      } as any;

      if (str in keywords) {
        return keywords[str];
      }

      // utf-8
      try {
        return decodeURIComponent(strWithoutPlus);
      } catch (e) {
        return strWithoutPlus;
      }
    },
  });

  // If there are no panes, instanciate empty dict
  if (urlState.panes === undefined) {
    urlState = {
      ...urlState,
      panes: {},
    };
  }

  return (urlState as unknown) as SurfaceViewState;
};

// Custom hook to load state from URL
const useSurfaceState = (): [
  SurfaceViewState,
  React.Dispatch<React.SetStateAction<SurfaceViewState>>
] => {
  const urlState = stateFromUrl();

  // Instantiate new state
  const [state, setState] = useState<SurfaceViewState>(urlState);

  // Update URL on state change
  const navigate = useNavigate();
  useEffect(() => {
    const newSearch = qs.stringify(state);
    if (`?${newSearch}` !== window.location.search) {
      navigate({
        search: newSearch,
      });
    }
  }, [state, navigate]);

  // Update state on URL change
  const location = useLocation();
  useEffect(() => {
    const newUrlState = stateFromUrl();
    if (!deepEqual(newUrlState, state)) {
      setState(newUrlState);
    }
  }, [location, state]);

  return [state, setState];
};

const SurfaceExplorer = ({ datasetId }: SurfaceViewProps) => {
  // Dataset information
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
  const [meshLabels, setMeshLabels] = useState<string[]>([]);
  const [meshTypeLabels, setMeshTypeLabels] = useState<string[]>([]);
  const [hemiLabels, setHemiLabels] = useState<string[]>([]);
  const [datasetDescriptions, setDatasetDescriptions] = useState<any>({});

  // Load state from url
  const [state, setState] = useSurfaceState();

  // Initialise all pane state variables
  useEffect(() => {
    const datasetInfo = server.get<DatasetInfo>(`/datasets/${datasetId}/info`);

    datasetInfo.then((value) => {
      setSubjectLabels(value.data.subjects);

      setContrastLabels(
        value.data.tasks_contrasts.map((label: any) => ({
          task: label[0],
          contrast: label[1],
        }))
      );

      setMeshLabels(value.data.mesh_supports);

      setHemiLabels(value.data.hemis);

      if (value.data.mesh_types !== undefined) {
        setMeshTypeLabels(value.data.mesh_types);
      }
    });

    setState({ panes: {} });
  }, [datasetId]);

  const selectedVoxels = Object.keys(state.panes).map((paneId: any) => [
    paneId,
    state.panes[paneId].voxels,
  ]);
  const previousSelectedVoxels = usePrevious(selectedVoxels);
  const [fingerprints, setFingerprints] = useState<number[][]>([]);

  const [showKeyDialog, setShowKeyDialog] = useState(false);

  const defaultPaneState = useCallback(
    (s: string[], c: ContrastLabel[], m: string[]) => {
      return {
        subject: s.length > 0 ? 0 : undefined,
        contrast: c.length > 0 ? 0 : undefined,
        meshSupport: m.length > 0 ? m[0] : undefined,
        meshType: MeshType.PIAL,
        hemi: HemisphereSide.LEFT,
        meanSurfaceMap: false,
        showDescription: false,
      };
    },
    []
  );

  useEffect(() => {
    // If no panes are present, create one with default state
    if (
      subjectLabels?.length > 0 &&
      contrastLabels?.length > 0 &&
      meshLabels?.length > 0
    ) {
      if (Object.keys(state.panes).length === 0) {
        setState(({
          ...state,
          panes: {
            [nanoid(4)]: defaultPaneState(
              subjectLabels,
              contrastLabels,
              meshLabels
            ),
          },
        } as unknown) as SurfaceViewState);
      }
    }
  }, [
    state,
    setState,
    subjectLabels,
    contrastLabels,
    meshLabels,
    defaultPaneState,
  ]);

  //
  // Util functions to modify view state
  //

  const addPane = useCallback(() => {
    const newState = {
      ...state,
      panes: {
        ...state.panes,
        [nanoid(4)]: defaultPaneState(
          subjectLabels,
          contrastLabels,
          meshLabels
        ),
      },
    };

    setState(newState);
  }, [
    state,
    setState,
    subjectLabels,
    contrastLabels,
    meshLabels,
    defaultPaneState,
  ]);

  const removePane = useCallback(
    (paneId: string) => {
      if (paneId in state.panes) {
        // Filter-out pane with matching id
        const { [paneId]: paneState, ...selectedPanes } = state.panes;
        const newState = {
          ...state,
          panes: selectedPanes,
        };
        setState(newState);
      }
    },
    [state, setState]
  );

  const updatePaneState = (paneId: string, paneState: SurfacePaneState) => {
    const newState = {
      ...state,
      panes: {
        ...state.panes,
        [paneId]: paneState,
      },
    };

    setState(newState);
  };

  const updateAllPanesState = (key: string, value: any) => {
    const newState = {
      ...state,
      panes: Object.fromEntries(
        Object.entries(state.panes).map(([k, v]) => {
          return [
            k,
            {
              ...v,
              [key]: value,
            },
          ];
        })
      ),
    };

    setState(newState);
  };

  const removeAllPanesKey = (key: keyof SurfacePaneState) => {
    const newState = {
      ...state,
      panes: Object.fromEntries(
        Object.keys(state.panes).map((paneId: string) => {
          const { [key]: value, ...paneState } = state.panes[paneId];
          return [paneId, { ...paneState }];
        })
      ),
    } as SurfaceViewState;

    setState(newState);
  };

  const shiftAllPanes = (key: string, shift: number, n: number) => {
    const newState = {
      ...state,
      panes: Object.fromEntries(
        Object.entries(state.panes).map(([k, v]) => {
          return [
            k,
            {
              ...v,
              [key]: modulo((state.panes[k] as any)[key] + shift, n),
            },
          ];
        })
      ),
    };

    setState(newState);
  };

  const setVoxel = (selectedPaneId: string, voxelId: number) => {
    const newState = {
      ...state,
      panes: Object.fromEntries(
        Object.keys(state.panes).map((paneId: string) => {
          const { voxels: value, ...paneState } = state.panes[paneId];
          return paneId === selectedPaneId
            ? [paneId, { voxels: [voxelId], ...paneState }]
            : [paneId, { ...paneState }];
        })
      ),
    } as SurfaceViewState;

    setState(newState);
  };

  const setSelectedTasks = (newSelectedTasks: string[]) => {
    // If new selectedTasks equal all tasks,
    // set selectedTasks value to undefined
    // (qs will omit key in url)
    const newState = {
      ...state,
      selectedTasks: deepEqual(
        newSelectedTasks.sort(),
        [...new Set(contrastLabels.map((label) => label.task))].sort()
      )
        ? undefined
        : newSelectedTasks,
    };

    setState(newState);
  };

  //
  // Keyboard events
  //

  // N
  const keyAddPane = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 78) {
        addPane();
      }
    },
    [addPane]
  );

  // ? key
  const toggleKeyDialog = useCallback(
    (event: any) => {
      if (event.target.matches("input")) return;

      if (event.isComposing || event.keyCode === 191) {
        setShowKeyDialog((currentShowKeyDialog) => !currentShowKeyDialog);
      }
    },
    [setShowKeyDialog]
  );

  useEffect(() => {
    window.addEventListener("keydown", keyAddPane);
    window.addEventListener("keydown", toggleKeyDialog);
    return () => {
      window.removeEventListener("keydown", keyAddPane);
      window.removeEventListener("keydown", toggleKeyDialog);
    };
  }, [keyAddPane, toggleKeyDialog]);

  // Page layout
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [showGridHelper, setShowGridHelper] = useState(true);
  // Surface map filtering and normalisation
  const [lowThresholdMin, setLowThresholdMin] = useState(-10);
  const [lowThresholdMax, setLowThresholdMax] = useState(0);
  const [highThresholdMin, setHighThresholdMin] = useState(0);
  const [highThresholdMax, setHighThresholdMax] = useState(10);
  const [filterSurface, setFilterSurface] = useState(true);
  // Fingerprint
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);

  // Update fingerprint when selected voxels
  // or selected subjects change
  const paneSubjects = Object.keys(state.panes).map(
    (k) => state.panes[k].subject
  );
  const previousPaneSubjects = usePrevious<(number | undefined)[]>(
    paneSubjects
  );
  const paneMeanSurfaceMaps = Object.keys(state.panes).map(
    (k) => state.panes[k].meanSurfaceMap
  );
  const previousPaneMeanSurfaceMaps = usePrevious<(boolean | undefined)[]>(
    paneMeanSurfaceMaps
  );

  useEffect(() => {
    if (
      selectedVoxels.length > 0 &&
      (!deepEqual(selectedVoxels, previousSelectedVoxels) ||
        !deepEqual(paneSubjects, previousPaneSubjects) ||
        !deepEqual(paneMeanSurfaceMaps, previousPaneMeanSurfaceMaps))
    ) {
      setLoadingFingerprint(true);
      const promises = Array.prototype.concat(
        ...selectedVoxels.map(([paneId, voxels]) => {
          if (voxels !== undefined) {
            return voxels.map((voxel: number) => {
              const { subject, meshSupport, hemi } = state.panes[paneId];
              if (subject !== undefined && meshSupport !== undefined) {
                return state.panes[paneId].meanSurfaceMap
                  ? server.get(
                      `/datasets/${datasetId}/voxel_fingerprint_mean`,
                      {
                        params: {
                          voxel_index: voxel,
                          mesh: meshSupport,
                          hemi: hemi,
                        },
                      }
                    )
                  : server.get(`/datasets/${datasetId}/voxel_fingerprint`, {
                      params: {
                        subject_index: subject,
                        voxel_index: voxel,
                        mesh: meshSupport,
                        hemi: hemi,
                      },
                    });
              } else {
                return Promise.resolve();
              }
            });
          } else {
            return [];
          }
        })
      );

      if (promises.length > 0) {
        Promise.all(promises)
          .then((values) => {
            setFingerprints(values.map((value) => value.data));
            setLoadingFingerprint(false);
          })
          .catch((error) => {
            console.log(error);
            setLoadingFingerprint(false);
          });
      } else {
        setFingerprints([]);
        setLoadingFingerprint(false);
      }
    }
  }, [
    datasetId,
    state.panes,
    selectedVoxels,
    previousSelectedVoxels,
    paneSubjects,
    previousPaneSubjects,
    paneMeanSurfaceMaps,
    previousPaneMeanSurfaceMaps,
  ]);

  return (
    <div
      className={`main-container ${
        fingerprints.length > 0 ? `${orientation}-orientation` : ""
      }`}
    >
      <KeyDialog
        isOpen={showKeyDialog}
        onClose={() => setShowKeyDialog(false)}
      />
      <div className="scenes">
        <SurfaceControls
          addPaneCallback={addPane}
          filterSurface={filterSurface}
          filterSurfaceCallback={() => setFilterSurface(!filterSurface)}
          showGridHelper={showGridHelper}
          showGridHelperCallback={() => setShowGridHelper(!showGridHelper)}
          showKeyDialog={showKeyDialog}
          showKeyDialogCallback={() => setShowKeyDialog(true)}
        />
        <div className="scene-panes">
          <div className="scene-row">
            {Object.keys(state.panes).map((paneId: string) => {
              const pane = state.panes[paneId];
              return (
                <SurfacePane
                  key={`scene-pane-${paneId}`}
                  paneId={paneId}
                  datasetId={datasetId}
                  paneState={pane}
                  paneCallbacks={{
                    updatePaneState,
                    updateAllPanesState,
                    shiftAllPanes,
                    setVoxel,
                  }}
                  closeCallback={() => {
                    removePane(paneId);
                  }}
                  subjectLabels={subjectLabels}
                  contrastLabels={contrastLabels}
                  meshLabels={meshLabels}
                  meshTypeLabels={meshTypeLabels}
                  hemiLabels={hemiLabels}
                  datasetDescriptions={datasetDescriptions}
                  filterSurface={filterSurface}
                  lowThresholdMin={filterSurface ? lowThresholdMin : undefined}
                  lowThresholdMax={filterSurface ? lowThresholdMax : undefined}
                  highThresholdMin={
                    filterSurface ? highThresholdMin : undefined
                  }
                  highThresholdMax={
                    filterSurface ? highThresholdMax : undefined
                  }
                  showGridHelper={showGridHelper}
                />
              );
            })}
          </div>
        </div>
      </div>
      {fingerprints.length > 0 ? (
        <FingerprintPane
          fingerprints={fingerprints}
          loading={loadingFingerprint}
          contrastLabels={contrastLabels}
          selectedTasks={state.selectedTasks}
          setSelectedTasks={setSelectedTasks}
          filterSurface={filterSurface}
          closeCallback={() => {
            removeAllPanesKey("voxels");
          }}
          orientation={orientation}
          setOrientation={setOrientation}
          lowThresholdMin={lowThresholdMin}
          setLowThresholdMin={setLowThresholdMin}
          lowThresholdMax={lowThresholdMax}
          setLowThresholdMax={setLowThresholdMax}
          highThresholdMin={highThresholdMin}
          setHighThresholdMin={setHighThresholdMin}
          highThresholdMax={highThresholdMax}
          setHighThresholdMax={setHighThresholdMax}
        />
      ) : null}
    </div>
  );
};

export default SurfaceExplorer;
