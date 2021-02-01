import React, { useCallback, useEffect, useReducer, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import Colorbar from "components/colorbar";
import ContrastFingerprint from "components/contrastFingerprint";
import InfoPanel from "components/infoPanel";
import PanelButtons from "components/infoPanel/buttons";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import { ActionLabel, Orientation, Subject } from "constants/index";
import { eel } from "App";

const RegressionExplorer = () => {
  const [model, setModel] = useState<string>();
  const [models, setModels] = useState<string[]>([]);
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<string[]>([]);
  const [taskLabels, setTaskLabels] = useState<string[]>([]);
  const [taskCounts, setTaskCounts] = useState<number[]>([]);
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);
  const [meanFingerprint, setMeanFingerprint] = useState(false);
  const [errorMap, setErrorMap] = useState<number[] | undefined>();
  const [loadingContrastMap, setLoadingErrorMap] = useState(false);
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [wireframe, setWireframe] = useState(true);
  const [regressedCoordinates, setRegressedCoordinates] = useState<
    number[] | undefined
  >();

  const initialSubject: Subject = { index: 10, label: "sub-15" };
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
  const [subject, setSubject] = useReducer(subjectReducer, initialSubject);

  // Initialise all app state variables
  useEffect(() => {
    const fetchAllData = async () => {
      // Load static data
      const contrastLabels = eel.get_contrast_labels()();
      const tasks = eel.get_tasks()();
      const subjectLabels = eel.get_subjects()();
      const models = eel.get_regression_models()();

      // Wait for all data to be loaded before setting app state
      Promise.all([contrastLabels, tasks, subjectLabels, models]).then(
        (values) => {
          setContrastLabels(values[0]);
          setTaskLabels(values[1].map((x: any) => x[0]));
          setTaskCounts(values[1].map((x: any) => x[1]));
          setSubjectLabels(values[2]);
          setModels(values[3]);
        }
      );
    };

    fetchAllData();

    // Set keybinding
    const keyPressEvents = [
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
  }, [initialSubject.label]);

  // On subjectLabels & models change
  useEffect(() => {
    if (subjectLabels.length > 0 && models.length > 0) {
      setSubject({ payload: 0 });
      setModel(models[0]);
    }
  }, [subjectLabels, models]);

  // Update on subject change
  useEffect(() => {
    if (subject.label !== undefined && model !== undefined) {
      setLoadingErrorMap(true);
      eel.get_regressed_coordinates_error(
        model,
        subject.label
      )((error: number[]) => {
        setErrorMap(error);
        setLoadingErrorMap(false);
      });
    }
  }, [subject.label, model]);

  // Update coordinates on voxelIndex change
  useEffect(() => {
    // Get regressed coordinates on voxelIndex change
    if (
      voxelIndex !== undefined &&
      model !== undefined &&
      subject.label !== undefined
    ) {
      eel.get_regressed_coordinates(
        model,
        subject.label,
        voxelIndex
      )((coordinates: number[]) => {
        setRegressedCoordinates(coordinates);
      });
    }
  }, [voxelIndex, subject.label, model]);

  useEffect(() => {
    // Get activation fingerprint for this voxel
    setLoadingFingerprint(true);
    if (voxelIndex !== undefined) {
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
  }, [voxelIndex, subject.index, meanFingerprint]);

  // Set key events

  // I
  const incrementSubject = useCallback((event: any) => {
    if (event.isComposing || event.keyCode === 73) {
      setSubject({ type: "increment" });
    }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", incrementSubject);
    return () => window.removeEventListener("keydown", incrementSubject);
  }, [incrementSubject]);

  // K
  const decrementSubject = useCallback((event: any) => {
    if (event.isComposing || event.keyCode === 75) {
      setSubject({ type: "decrement" });
    }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", decrementSubject);
    return () => window.removeEventListener("keydown", decrementSubject);
  }, [decrementSubject]);

  return (
    <div
      className={`main-container ${
        voxelIndex !== undefined ? `${orientation}-orientation` : ""
      }`}
    >
      <InfoPanel
        rows={[
          {
            label: "Model",
            inputs: [
              {
                value: model,
                values: models,
                onChangeCallback: (newValue: string) => setModel(newValue),
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
      {loadingContrastMap ? (
        <TextualLoader text="Loading error map..." />
      ) : null}
      <div className="scene">
        <Colorbar
          vmin={errorMap ? Math.min(...errorMap) : undefined}
          vmax={errorMap ? Math.max(...errorMap) : undefined}
          unit="Voxels"
        />
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(voxelIndex: number) => {
                setVoxelIndex(voxelIndex);
              }}
              voxelIndex={voxelIndex}
              surfaceMap={errorMap}
              wireframe={wireframe}
              markerCoordinates={
                regressedCoordinates !== undefined
                  ? [regressedCoordinates]
                  : undefined
              }
              width={sceneWidth}
              height={sceneHeight}
            />
          )}
        </ParentSize>
      </div>
      {voxelIndex !== undefined ? (
        <div className="fingerprint">
          <PanelButtons
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
            meanFingerprint={meanFingerprint}
            meanChangeCallback={() => {
              setMeanFingerprint(!meanFingerprint);
            }}
            clickCloseCallback={() => {
              setVoxelIndex(undefined);
            }}
          />
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
      ) : null}
    </div>
  );
};

export default RegressionExplorer;
