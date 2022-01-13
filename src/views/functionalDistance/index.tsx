import { AxiosResponse } from "axios";
import { nanoid } from "nanoid";
import { useEffect, useReducer, useState } from "react";

import { server } from "App";
import Colorbar from "components/colorbar";
import FingerprintPane from "components/pane/fingerprint";
import PaneControls, { InputType } from "components/paneControls";
import PaneButtons from "components/paneControls/buttons";
import PanesButtons from "./panesButtons";
import ScenePane from "./scenePane";
import TextualLoader from "components/textualLoader";
import {
  ActionLabel,
  ActionPane,
  colormaps,
  ContrastLabel,
  Metric,
  Orientation,
  Subject,
  SurfaceMapType,
} from "constants/index";
import "./style.scss";

const FunctionalDistanceExplorer = () => {
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);
  const [meanFingerprint, setMeanFingerprint] = useState(false);
  const [surfaceMap, setSurfaceMap] = useState<number[] | undefined>();
  const [meanSurfaceMap, setMeanSurfaceMap] = useState(false);
  const [loadingSurfaceMap, setLoadingSurfaceMap] = useState(false);
  const [surfaceMapType, setSurfaceMapType] = useState(
    SurfaceMapType.SEED_BASED
  );
  const [metric, setMetric] = useState(Metric.COSINE);
  const [m] = useState(0.3);
  const [, setFunctionalDistances] = useState<number[]>([]);
  const [, setLoadingFunctionalDistances] = useState(false);
  const [meanFunctionalDistance, setMeanFunctionalDistance] = useState(false);
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [wireframe, setWireframe] = useState(false);
  const [sharedState, setSharedState] = useState(true);

  const colormapName = "magma_r";

  const subjectReducer = (state: Subject, action: ActionLabel): Subject => {
    let newIndex = state.index;
    let n = subjectLabels.length;
    switch (action.type) {
      case "increment":
        newIndex = ((((state.index ?? 0) + 1) % n) + n) % n;
        break;
      case "decrement":
        newIndex = ((((state.index ?? 0) - 1) % n) + n) % n;
        break;
      default:
        newIndex = ((action.payload ?? 0 % n) + n) % n;
        break;
    }
    return {
      index: newIndex,
      label: subjectLabels[newIndex],
    };
  };
  const [subject, setSubject] = useReducer(subjectReducer, {} as Subject);

  const panesReducer = (state: string[], action: ActionPane): string[] => {
    const newState = [...state];

    switch (action.type) {
      case "add":
        newState.push(nanoid());
        break;
      case "remove":
        if (action.payload !== undefined) {
          const index = state.indexOf(action.payload);
          if (index >= 0) {
            newState.splice(index, 1);
          }
        }
        break;
      default:
        break;
    }

    return newState;
  };
  const [panes, setPanes] = useReducer(panesReducer, [nanoid()]);

  // Initialise all app state variables
  useEffect(() => {
    const fetchAllData = async () => {
      // Load static data
      const subjectLabels = server.get<string[]>("/ibc/subjects");
      const contrastLabels = server.get<string[][]>("/ibc/contrast_labels");

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels]).then((values) => {
        setSubjectLabels(values[0].data);

        setContrastLabels(
          values[1].data.map((label: any) => ({
            task: label[0],
            contrast: label[1],
          }))
        );
        if (values[0].data.length > 0) {
          setSubject({ payload: 0 });
        }
      });
    };

    fetchAllData();

    // Set keybinding
    const keyPressEvents = [
      {
        keyCode: 75, // K
        callback: () => {
          setSubject({ type: "decrement" });
        },
      },
      {
        keyCode: 73, // I
        callback: () => {
          setSubject({ type: "increment" });
        },
      },
      {
        keyCode: 85, // U
        callback: () => {
          setMeanSurfaceMap((prevMeanSurfaceMap) => !prevMeanSurfaceMap);
          setMeanFunctionalDistance(
            (prevMeanFunctionalDistance) => !prevMeanFunctionalDistance
          );
        },
      },
      {
        keyCode: 79, // O
        callback: () => {
          setMeanFingerprint((prevMeanFingerprint) => !prevMeanFingerprint);
        },
      },
      {
        keyCode: 87, // W
        callback: () => {
          setWireframe((prevWireframe) => !prevWireframe);
        },
      },
      {
        keyCode: 78, // N
        callback: () => {
          setPanes({ type: "add" });
        },
      },
    ];

    keyPressEvents.forEach((keyPressEvent: any) => {
      window.addEventListener("keydown", (event) => {
        if (event.isComposing || event.keyCode === keyPressEvent.keyCode) {
          keyPressEvent.callback();
        }
      });
    });

    return () => {
      keyPressEvents.forEach((keyPressEvent: any) => {
        window.removeEventListener("keydown", (event) => {
          if (event.isComposing || event.keyCode === keyPressEvent.keyCode) {
            keyPressEvent.callback();
          }
        });
      });
    };
  }, []);

  // Update surface map when subject, voxel, metric or type change
  useEffect(() => {
    if (subject && subject.index !== undefined && voxelIndex) {
      setLoadingSurfaceMap(true);
      switch (surfaceMapType) {
        case SurfaceMapType.SEED_BASED:
          if (meanSurfaceMap) {
            server
              .get("/mean_distance_map", {
                params: { voxel_index: voxelIndex },
              })
              .then((response: AxiosResponse<number[]>) => {
                setSurfaceMap(response.data);
                setLoadingSurfaceMap(false);
              });
          } else {
            server
              .get("/distance_map", {
                params: {
                  subject_index: subject.index,
                  voxel_index: voxelIndex,
                },
              })
              .then((response: AxiosResponse<number[]>) => {
                setSurfaceMap(response.data);
                setLoadingSurfaceMap(false);
              });
          }
          break;
        case SurfaceMapType.M_DISTANCE:
          if (meanSurfaceMap) {
            server
              .get("/mean_topographic_distance_to_m_functional_distance", {
                params: { m: m },
              })
              .then((response: AxiosResponse<number[]>) => {
                setSurfaceMap(response.data);
                setLoadingSurfaceMap(false);
              });
          } else {
            server
              .get("/topographic_distance_to_m_functional_distance", {
                params: { subject_index: subject.index, m: m },
              })
              .then((response: AxiosResponse<number[]>) => {
                setSurfaceMap(response.data);
                setLoadingSurfaceMap(false);
              });
          }
          break;
        default:
          console.log("Unknown surfaceMapType");
          setLoadingSurfaceMap(false);
          break;
      }
    }
  }, [subject, voxelIndex, m, surfaceMapType, meanSurfaceMap]);

  // Update fingerprint when voxelIndex or subject change
  useEffect(() => {
    if (voxelIndex !== undefined) {
      setLoadingFingerprint(true);
      if (meanFingerprint) {
        server
          .get("/voxel_fingerprint_mean", {
            params: { voxel_index: voxelIndex },
          })
          .then((response: AxiosResponse<number[]>) => {
            setContrastFingerprint(response.data);
            setLoadingFingerprint(false);
          });
      } else if (subject.index !== undefined) {
        server
          .get("/voxel_fingerprint", {
            params: { subject_index: subject.index, voxel_index: voxelIndex },
          })
          .then((response: AxiosResponse<number[]>) => {
            setContrastFingerprint(response.data);
            setLoadingFingerprint(false);
          });
      } else {
        setLoadingFingerprint(false);
      }
    }
  }, [voxelIndex, subject, meanFingerprint]);

  // Update functional distances when voxelIndex or subject change
  useEffect(() => {
    if (voxelIndex !== undefined) {
      setLoadingFunctionalDistances(true);
      if (meanFunctionalDistance) {
        server
          .get("/mean_across_subjects_mean_functional_distance", {
            params: { voxel_index: voxelIndex },
          })
          .then((response: AxiosResponse<number[]>) => {
            setFunctionalDistances(response.data);
            setLoadingFunctionalDistances(false);
          });
      } else if (subject.index !== undefined) {
        server
          .get("/mean_functional_distance", {
            params: { subject_index: subject.index, voxel_index: voxelIndex },
          })
          .then((response: AxiosResponse<number[]>) => {
            setFunctionalDistances(response.data);
            setLoadingFunctionalDistances(false);
          });
      } else {
        setLoadingFunctionalDistances(false);
      }
    }
  }, [voxelIndex, subject, meanFunctionalDistance]);

  return (
    <div
      className={`main-container ${
        voxelIndex !== undefined ? `${orientation}-orientation` : ""
      }`}
    >
      <div className="scenes">
        {loadingSurfaceMap ? (
          <TextualLoader text="Loading surface map..." />
        ) : null}
        <Colorbar colormap={colormaps[colormapName]} />
        <PanesButtons
          addPaneCallback={() => {
            setPanes({ type: "add" });
          }}
          sharedState={sharedState}
          sharedStateCallback={() => {
            setSharedState(!sharedState);
          }}
        />
        {sharedState ? (
          <PaneControls
            rows={[
              {
                label: "Metric",
                inputs: [
                  {
                    inputType: InputType.SELECT_STRING,
                    value: metric,
                    values: Object.keys(Metric),
                    onChangeCallback: (newValue: string) =>
                      setMetric(Metric[newValue as keyof typeof Metric]),
                  },
                ],
              },
              {
                label: "Surface Type",
                inputs: [
                  {
                    inputType: InputType.SELECT_STRING,
                    value: surfaceMapType,
                    values: Object.keys(SurfaceMapType),
                    onChangeCallback: (newValue: string) =>
                      setSurfaceMapType(
                        SurfaceMapType[newValue as keyof typeof SurfaceMapType]
                      ),
                  },
                ],
              },
              {
                label: "Subject",
                inputs: [
                  {
                    inputType: InputType.SELECT_STRING,
                    value: subject.label,
                    values: subjectLabels,
                    onChangeCallback: (newValue: string) =>
                      setSubject({ payload: subjectLabels.indexOf(newValue) }),
                  },
                  {
                    inputType: InputType.BUTTON,
                    value: meanSurfaceMap,
                    onChangeCallback: () => setMeanSurfaceMap(!meanSurfaceMap),
                    iconActive: "group-objects",
                    iconInactive: "ungroup-objects",
                    title: "Mean across subjects",
                  },
                ],
              },
              {
                label: "Voxel",
                inputs: [
                  {
                    inputType: InputType.LABEL,
                    value: voxelIndex ? voxelIndex.toString() : undefined,
                  },
                ],
              },
            ]}
          />
        ) : null}
        <div className="scene-panes">
          {panes.map((paneId: string) => {
            return (
              <ScenePane
                key={`scene-pane-${paneId}`}
                closeCallback={() => {
                  setPanes({ type: "remove", payload: paneId });
                }}
                colormapName={colormapName}
                sharedSurfaceMap={surfaceMap}
                sharedVoxelIndex={voxelIndex}
                setSharedVoxelIndex={(newVoxelIndex: number) => {
                  setVoxelIndex(newVoxelIndex);
                }}
                subjectLabels={subjectLabels}
                sharedState={sharedState}
                sharedSubject={subject}
                sharedMeanSurfaceMap={meanSurfaceMap}
                sharedWireframe={wireframe}
                sharedSurfaceMapType={surfaceMapType}
                sharedMetric={metric}
              />
            );
          })}
        </div>
      </div>
      {voxelIndex !== undefined ? (
        <div
          id="plots-container"
          className={`${
            orientation === Orientation.HORIZONTAL
              ? Orientation.VERTICAL
              : Orientation.HORIZONTAL
          }-orientation`}
        >
          <PaneButtons
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
              setVoxelIndex(undefined);
            }}
          />

          <FingerprintPane
            fingerprints={[contrastFingerprint]}
            loading={loadingFingerprint}
            contrastLabels={contrastLabels}
            closeCallback={() => {
              setVoxelIndex(undefined);
            }}
            orientation={orientation}
            setOrientation={setOrientation}
          />
        </div>
      ) : null}
    </div>
  );
};

export default FunctionalDistanceExplorer;
