import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { nanoid } from "nanoid";
import React, { useEffect, useReducer, useState } from "react";

import Colorbar from "components/colorbar";
import ContrastFingerprint from "components/contrastFingerprint";
import DistanceBars from "./distanceBars";
import InfoPanel from "components/infoPanel";
import PanelButtons from "components/infoPanel/buttons";
import PanesButtons from "./panesButtons";
import ScenePane from "./scenePane";
import TextualLoader from "components/textualLoader";
import {
  ActionLabel,
  ActionPane,
  MeshType,
  Metric,
  Orientation,
  Subject,
  SurfaceMapType,
} from "constants/index";
import { eel } from "App";
import "./style.scss";

const FunctionalDistanceExplorer = () => {
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<string[]>([]);
  const [taskLabels, setTaskLabels] = useState<string[]>([]);
  const [taskCounts, setTaskCounts] = useState<number[]>([]);
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
  const [m, setM] = useState(0.3);
  const [functionalDistances, setFunctionalDistances] = useState<number[]>([]);
  const [loadingFunctionalDistances, setLoadingFunctionalDistances] = useState(
    false
  );
  const [meanFunctionalDistance, setMeanFunctionalDistance] = useState(false);
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [wireframe, setWireframe] = useState(false);
  const [meshType] = useState(MeshType.PIAL);
  const [sharedState, setSharedState] = useState(true);

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
      const subjectLabels = eel.get_subjects()();
      const contrastLabels = eel.get_contrast_labels()();
      const tasks = eel.get_tasks()();

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels, tasks]).then((values) => {
        setSubjectLabels(values[0]);
        setContrastLabels(values[1]);
        setTaskLabels(values[2].map((x: any) => x[0]));
        setTaskCounts(values[2].map((x: any) => x[1]));
        if (values[0].length > 0) {
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
            eel.get_mean_distance_map(voxelIndex)((surfaceMap: number[]) => {
              setSurfaceMap(surfaceMap);
              setLoadingSurfaceMap(false);
            });
          } else {
            eel.get_distance_map(
              subject.index,
              voxelIndex
            )((surfaceMap: number[]) => {
              setSurfaceMap(surfaceMap);
              setLoadingSurfaceMap(false);
            });
          }
          break;
        case SurfaceMapType.M_DISTANCE:
          if (meanSurfaceMap) {
            eel.get_mean_topographic_distance_to_m_functional_distance(m)(
              (surfaceMap: number[]) => {
                setSurfaceMap(surfaceMap);
                setLoadingSurfaceMap(false);
              }
            );
          } else {
            eel.get_topographic_distance_to_m_functional_distance(
              subject.index,
              m
            )((surfaceMap: number[]) => {
              setSurfaceMap(surfaceMap);
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
        eel.get_voxel_fingerprint_mean(voxelIndex)((fingerprint: number[]) => {
          setContrastFingerprint(fingerprint);
          setLoadingFingerprint(false);
        });
      } else if (subject.index !== undefined) {
        eel.get_voxel_fingerprint(
          subject.index,
          voxelIndex
        )((contrastFingerprint: number[]) => {
          setContrastFingerprint(contrastFingerprint);
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
        eel.get_mean_across_subjects_mean_functional_distance(voxelIndex)(
          (distances: number[]) => {
            setFunctionalDistances(distances);
            setLoadingFunctionalDistances(false);
          }
        );
      } else if (subject.index !== undefined) {
        eel.get_mean_functional_distance(
          subject.index,
          voxelIndex
        )((distances: number[]) => {
          setFunctionalDistances(distances);
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
        <Colorbar nUniqueValues={10} />
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
          <InfoPanel
            rows={[
              {
                label: "Metric",
                inputs: [
                  {
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
                    value: subject.label,
                    values: subjectLabels,
                    onChangeCallback: (newValue: string) =>
                      setSubject({ payload: subjectLabels.indexOf(newValue) }),
                  },
                  {
                    value: meanSurfaceMap,
                    onChangeCallback: () => setMeanSurfaceMap(!meanSurfaceMap),
                    iconActive: "group-objects",
                    iconInactive: "ungroup-objects",
                    title: "Take subject's mean",
                  },
                ],
              },
              {
                label: "Voxel",
                inputs: [
                  {
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
          <PanelButtons
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
            meanFingerprint={meanFingerprint}
            meanChangeCallback={() => {
              setMeanFingerprint(!meanFingerprint);
            }}
            clickCloseCallback={() => {
              setVoxelIndex(undefined);
            }}
          />
          <div id="fingerprint">
            <ParentSize className="fingerprint-container" debounceTime={10}>
              {({ width: fingerprintWidth, height: fingerprintHeight }) => (
                <ContrastFingerprint
                  loading={loadingFingerprint}
                  orientation={
                    orientation === Orientation.VERTICAL
                      ? Orientation.HORIZONTAL
                      : Orientation.VERTICAL
                  }
                  contrastLabels={contrastLabels}
                  taskLabels={taskLabels}
                  taskCounts={taskCounts}
                  fingerprint={contrastFingerprint}
                  width={fingerprintWidth}
                  height={fingerprintHeight}
                />
              )}
            </ParentSize>
          </div>
          <ParentSize
            className="functional-distances-container"
            debounceTime={10}
          >
            {({
              width: functionalDistanceWidth,
              height: functionalDistanceHeight,
            }) => (
              <DistanceBars
                loading={loadingFunctionalDistances}
                distances={functionalDistances}
                m={m}
                mChangeCallback={(newM: number) => {
                  setM(newM);
                }}
                width={functionalDistanceWidth}
                height={functionalDistanceHeight}
                sliderEnabled={surfaceMapType === SurfaceMapType.M_DISTANCE}
              />
            )}
          </ParentSize>
          <div></div>
        </div>
      ) : null}
    </div>
  );
};

export default FunctionalDistanceExplorer;
