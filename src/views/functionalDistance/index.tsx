import React, { useEffect, useReducer, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import ContrastFingerprint from "components/contrastFingerprint";
import DistanceBars from "./distanceBars";
import InfoPanel from "./infoPanel";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import { Orientation, Subject } from "constants/index";
import { eel } from "App";
import "./style.scss";

type ActionLabel = {
  type?: "increment" | "decrement";
  payload?: number;
};

export enum SurfaceMapType {
  SEED_BASED = "seed-based",
  M_DISTANCE = "m-distance",
}

export type SurfaceMapTypeString = keyof typeof SurfaceMapType;

export enum Metric {
  COSINE = "cosine",
}

export type MetricString = keyof typeof Metric;

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
        keyCode: 73, // K
        callback: () => {
          setSubject({ type: "decrement" });
        },
      },
      {
        keyCode: 75, // I
        callback: () => {
          setSubject({ type: "increment" });
        },
      },
      {
        keyCode: 85, // U
        callback: () => {
          setMeanSurfaceMap((prevMeanSurfaceMap) => !prevMeanSurfaceMap);
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
            eel.get_mean_topographic_distance_to_m_functional_distance(
              voxelIndex,
              m
            )((surfaceMap: number[]) => {
              setSurfaceMap(surfaceMap);
              setLoadingSurfaceMap(false);
            });
          } else {
            eel.get_topographic_distance_to_m_functional_distance(
              subject.index,
              voxelIndex,
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
      id="main-container"
      className={`${
        voxelIndex !== undefined ? `${orientation}-orientation` : ""
      }`}
    >
      <InfoPanel
        subjectLabels={subjectLabels}
        subject={subject.label}
        subjectChangeCallback={(subjectIndex: number) => {
          setSubject({ payload: subjectIndex });
        }}
        meanSurfaceMap={meanSurfaceMap}
        meanChangeCallback={() => {
          setMeanSurfaceMap(!meanSurfaceMap);
        }}
        voxelIndex={voxelIndex}
        metric={metric}
        metricLabels={Object.keys(Metric) as MetricString[]}
        metricChangeCallback={(metric: Metric) => {
          setMetric(metric);
        }}
        surfaceMapType={surfaceMapType}
        surfaceMapTypeLabels={
          Object.keys(SurfaceMapType) as SurfaceMapTypeString[]
        }
        surfaceMapTypeChangeCallback={(surfaceMapType: SurfaceMapType) => {
          setSurfaceMapType(surfaceMapType);
        }}
      />
      {loadingSurfaceMap ? (
        <TextualLoader text="Loading surface map..." />
      ) : null}
      <div id="scene">
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(voxelIndex: number) => {
                setVoxelIndex(voxelIndex);
              }}
              selectedVoxel={voxelIndex}
              surfaceMap={surfaceMap}
              wireframe={wireframe}
              width={sceneWidth}
              height={sceneHeight}
            />
          )}
        </ParentSize>
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
          <div id="fingerprint">
            <ParentSize className="fingerprint-container" debounceTime={10}>
              {({ width: fingerprintWidth, height: fingerprintHeight }) => (
                <ContrastFingerprint
                  loading={loadingFingerprint}
                  changeOrientationCallback={() => {
                    switch (orientation) {
                      case Orientation.VERTICAL:
                        setOrientation(Orientation.HORIZONTAL);
                        break;
                      case Orientation.HORIZONTAL:
                        setOrientation(Orientation.VERTICAL);
                        break;
                    }
                  }}
                  closePanelCallback={() => {
                    setVoxelIndex(undefined);
                  }}
                  orientation={
                    orientation === Orientation.VERTICAL
                      ? Orientation.HORIZONTAL
                      : Orientation.VERTICAL
                  }
                  contrastLabels={contrastLabels}
                  taskLabels={taskLabels}
                  taskCounts={taskCounts}
                  fingerprint={contrastFingerprint}
                  meanFingerprint={meanFingerprint}
                  meanFingerprintCallback={() => {
                    setMeanFingerprint(!meanFingerprint);
                  }}
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
                width={functionalDistanceWidth}
                height={functionalDistanceHeight}
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
