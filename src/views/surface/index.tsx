import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosResponse } from "axios";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import * as qs from "qs";

import ContrastFingerprint from "components/contrastFingerprint";
import PaneControls from "components/paneControls/buttons";
import SurfaceControls from "./surfaceControls";
import SurfacePane, { defaultPaneState, SurfacePaneState } from "./surfacePane";
import { ContrastLabel, Orientation, modulo } from "constants/index";
import { server } from "App";

interface SurfaceViewState {
  panes: { [paneId: string]: SurfacePaneState };
}

// Custom hook to load state from URL
const useSurfaceState = (): [
  SurfaceViewState,
  React.Dispatch<React.SetStateAction<SurfaceViewState>>
] => {
  // Load state from URL and convert it to SurfaceViewState
  // (decode booleans and numbers with custom decoder)
  let urlState = qs.parse(window.location.search, {
    ignoreQueryPrefix: true,
    decoder(str, _, charset) {
      const strWithoutPlus = str.replace(/\+/g, " ");
      if (charset === "iso-8859-1") {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
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
  // as unknown) as SurfaceViewState;

  // If no panes are present, create one with default state
  if (urlState.panes === undefined) {
    urlState = {
      ...urlState,
      panes: {
        [nanoid()]: defaultPaneState,
      },
    };
  }

  // Instantiate new state
  const [state, setState] = useState<any>(urlState);

  // Update URL on state change
  const history = useHistory();

  useEffect(() => {
    history.push({
      search: qs.stringify(state),
    });
  }, [state, history]);

  return [state, setState];
};

const SurfaceExplorer = () => {
  // Load state from url
  const [state, setState] = useSurfaceState();

  //
  // Util functions to modify view state
  //

  const addPane = useCallback(() => {
    const newState = {
      ...state,
      panes: {
        ...state.panes,
        [nanoid()]: defaultPaneState,
      },
    };

    setState(newState);
  }, [state, setState]);

  const removePane = useCallback(
    (paneId: string) => {
      console.log("removePane");
      if (paneId in state.panes) {
        console.log(state);
        // Filter-out pane with matching id
        const { [paneId]: newValue, ...selectedPanes } = state.panes;
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

  const updatePaneKey = (paneId: string, key: string, value: any) => {
    const newState = {
      ...state,
      panes: {
        ...state.panes,
        [paneId]: {
          ...state.panes[paneId],
          [key]: value,
        },
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

  //
  // Keyboard events
  //

  // N
  const keyAddPane = useCallback(
    (event: any) => {
      if (event.isComposing || event.keyCode === 78) {
        addPane();
      }
    },
    [addPane]
  );

  useEffect(() => {
    window.addEventListener("keydown", keyAddPane);
    return () => {
      window.removeEventListener("keydown", keyAddPane);
    };
  }, [keyAddPane]);

  // Label information
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
  const [datasetDescriptions, setDatasetDescriptions] = useState<any>({});
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
  const [selectedPaneId, setSelectedPaneId] = useState<string | undefined>(
    undefined
  );
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);
  // const [meanFingerprint, setMeanFingerprint] = useState(false);

  // Initialise all pane state variables
  useEffect(() => {
    const fetchAllData = async () => {
      // Load static data
      const subjectLabels = server.get<string[]>("/ibc/subjects");
      const contrastLabels = server.get<string[][]>("/ibc/contrast_labels");
      const datasetDescriptions = server.get<any>("/ibc/descriptions");

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels, datasetDescriptions]).then(
        (values) => {
          setSubjectLabels(values[0].data);

          setContrastLabels(
            values[1].data.map((label: any) => ({
              task: label[0],
              contrast: label[1],
            }))
          );

          setDatasetDescriptions(values[2].data);
        }
      );
    };

    fetchAllData();
  }, []);

  // Update fingerprint when voxelIndex or subjectIndex change
  useEffect(() => {
    if (selectedPaneId !== undefined) {
      setLoadingFingerprint(true);
      // if (meanFingerprint) {
      //   server
      //     .get("/voxel_fingerprint_mean", {
      //       params: {
      //         voxel_index: voxelIndex,
      //         mesh: meshSupport,
      //       },
      //     })
      //     .then((response: AxiosResponse<number[]>) => {
      //       setContrastFingerprint(response.data);
      //       setLoadingFingerprint(false);
      //     });
      if (state.panes[selectedPaneId].selectedVoxel !== undefined) {
        const pane = state.panes[selectedPaneId];
        server
          .get("/ibc/voxel_fingerprint", {
            params: {
              subject_index: pane.subject,
              voxel_index: pane.selectedVoxel,
              mesh: pane.meshSupport,
            },
          })
          .then((response: AxiosResponse<number[]>) => {
            setContrastFingerprint(response.data);
            setLoadingFingerprint(false);
          });
      } else {
        setLoadingFingerprint(false);
      }
    }
  }, [selectedPaneId, state.panes]);

  return (
    <div
      className={`main-container ${
        selectedPaneId !== undefined ? `${orientation}-orientation` : ""
      }`}
    >
      <div className="scenes">
        <SurfaceControls
          addPaneCallback={addPane}
          filterSurface={filterSurface}
          filterSurfaceCallback={() => setFilterSurface(!filterSurface)}
          showGridHelper={showGridHelper}
          showGridHelperCallback={() => setShowGridHelper(!showGridHelper)}
        />
        <div className="scene-panes">
          <div className="scene-row">
            {Object.keys(state.panes).map((paneId: string) => {
              const pane = state.panes[paneId];
              return (
                <SurfacePane
                  key={`scene-pane-${paneId}`}
                  paneId={paneId}
                  paneState={pane}
                  paneCallbacks={{
                    updatePaneState,
                    updateAllPanesState,
                    shiftAllPanes,
                  }}
                  closeCallback={() => {
                    removePane(paneId);
                  }}
                  subjectLabels={subjectLabels}
                  contrastLabels={contrastLabels}
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
      {selectedPaneId !== undefined ? (
        <div className="fingerprint">
          <PaneControls
            orientation={
              orientation === Orientation.VERTICAL
                ? Orientation.HORIZONTAL
                : Orientation.VERTICAL
            }
            orientationChangeCallback={() => {
              switch (orientation) {
                case Orientation.VERTICAL:
                  setOrientation(Orientation.HORIZONTAL);
                  break;
                case Orientation.HORIZONTAL:
                  setOrientation(Orientation.VERTICAL);
                  break;
              }
            }}
            clickCloseCallback={() => {
              setSelectedPaneId(undefined);
            }}
          />
          <ParentSize className="fingerprint-container" debounceTime={10}>
            {({ width: fingerprintWidth, height: fingerprintHeight }) => (
              <ContrastFingerprint
                loading={loadingFingerprint}
                clickedLabelCallback={(contrastIndex: number) => {
                  updatePaneKey(selectedPaneId, "contrast", contrastIndex);
                }}
                orientation={
                  orientation === Orientation.VERTICAL
                    ? Orientation.HORIZONTAL
                    : Orientation.VERTICAL
                }
                contrastLabels={contrastLabels}
                fingerprint={contrastFingerprint}
                width={fingerprintWidth}
                height={fingerprintHeight}
                lowThresholdMin={filterSurface ? lowThresholdMin : undefined}
                lowThresholdMax={filterSurface ? lowThresholdMax : undefined}
                highThresholdMin={filterSurface ? highThresholdMin : undefined}
                highThresholdMax={filterSurface ? highThresholdMax : undefined}
                lowHandleMinRelease={(newValue: number) =>
                  setLowThresholdMin(newValue)
                }
                lowHandleMaxRelease={(newValue: number) =>
                  setLowThresholdMax(newValue)
                }
                highHandleMinRelease={(newValue: number) =>
                  setHighThresholdMin(newValue)
                }
                highHandleMaxRelease={(newValue: number) =>
                  setHighThresholdMax(newValue)
                }
              />
            )}
          </ParentSize>
        </div>
      ) : null}
    </div>
  );
};

export default SurfaceExplorer;
