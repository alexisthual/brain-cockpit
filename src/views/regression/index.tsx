import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosResponse } from "axios";
import React, { useCallback, useEffect, useReducer, useState } from "react";

import { server } from "App";
import Colorbar from "components/colorbar";
import ContrastFingerprint from "components/contrastFingerprint";
import PaneControls, { InputType } from "components/paneControls";
import PaneButtons from "components/paneControls/buttons";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import {
  ActionLabel,
  colormaps,
  ContrastLabel,
  Orientation,
  Subject,
} from "constants/index";

const RegressionExplorer = () => {
  const [model, setModel] = useState<string>();
  const [models, setModels] = useState<string[]>([]);
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
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
      const subjectLabels = server.get<string[]>("subjects");
      const contrastLabels = server.get<string[][]>("contrast_labels");
      const models = server.get<string[]>("regression_models");

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels, models]).then((values) => {
        setSubjectLabels(values[0].data);
        setContrastLabels(
          values[1].data.map((label: any) => ({
            task: label[0],
            contrast: label[1],
          }))
        );
        setModels(values[2].data);
      });
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
      server
        .get("/regressed_coordinates_error", {
          params: { model: model, subject: subject.label },
        })
        .then((response: AxiosResponse<number[]>) => {
          setErrorMap(response.data);
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
      server
        .get("/regressed_coordinates", {
          params: {
            model: model,
            subject: subject.label,
            voxel_index: voxelIndex,
          },
        })
        .then((response: AxiosResponse<number[]>) => {
          setRegressedCoordinates(response.data);
        });
    }
  }, [voxelIndex, subject.label, model]);

  useEffect(() => {
    // Get activation fingerprint for this voxel
    setLoadingFingerprint(true);
    if (voxelIndex !== undefined) {
      if (meanFingerprint) {
        server
          .get("/voxel_fingerprint_mean", {
            params: {
              voxel_index: voxelIndex,
            },
          })
          .then((response: AxiosResponse<number[]>) => {
            setContrastFingerprint(response.data);
            setLoadingFingerprint(false);
          });
      } else if (subject.index !== undefined) {
        server
          .get("/voxel_fingerprint", {
            params: {
              subject_index: subject.index,
              voxel_index: voxelIndex,
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
      <PaneControls
        rows={[
          {
            label: "Model",
            inputs: [
              {
                inputType: InputType.SELECT_STRING,
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
                inputType: InputType.SELECT_STRING,
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
                inputType: InputType.LABEL,
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
          colormap={colormaps["viridis"]}
          vmin={errorMap ? Math.min(...errorMap) : undefined}
          vmax={errorMap ? Math.max(...errorMap) : undefined}
          unit="mm"
        />
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(voxelIndex: number) => {
                setVoxelIndex(voxelIndex);
              }}
              colormap={colormaps["viridis"]}
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
          <PaneButtons
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
