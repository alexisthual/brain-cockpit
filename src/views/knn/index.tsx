import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosResponse } from "axios";
import { useCallback, useEffect, useReducer, useState } from "react";

import { server } from "App";
import Colorbar from "components/colorbar";
import FingerprintPane from "components/pane/fingerprint";
import PaneControls, { InputType } from "components/paneControls";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import {
  ActionLabel,
  colormaps,
  ContrastLabel,
  Orientation,
  Subject,
} from "constants/index";

const KnnExplorer = () => {
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [meanAcrossSubjects, setMeanAcrossSubjects] = useState(false);
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);
  const [meanFingerprint, setMeanFingerprint] = useState(false);
  const [knnIndices, setKnnIndices] = useState<number[]>([]);
  const [distanceMap, setDistanceMap] = useState<number[] | undefined>();
  const [loadingContrastMap, setLoadingDistanceMap] = useState(false);
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [wireframe, setWireframe] = useState(true);

  const colormapName = "magma_r";

  const initialSubject: Subject = { index: 0, label: "sub-01" };
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
      const subjectLabels = server.get<string[]>("/datasets/ibc/subjects");
      const contrastLabels = server.get<string[][]>(
        "/datasets/ibc/contrast_labels"
      );

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels]).then((values) => {
        setSubjectLabels(values[0].data);
        setContrastLabels(
          values[1].data.map((label: any) => ({
            task: label[0],
            contrast: label[1],
          }))
        );
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

  // On subjectLabels change
  useEffect(() => {
    if (subjectLabels.length > 0) {
      setSubject({ payload: 0 });
    }
  }, [subjectLabels]);

  // Update on subject change
  useEffect(() => {
    setLoadingDistanceMap(true);
    if (meanAcrossSubjects) {
      server
        .get("/knn_distance_mean")
        .then((response: AxiosResponse<number[]>) => {
          setDistanceMap(response.data);
          setLoadingDistanceMap(false);
        });
    } else if (subject.index !== undefined) {
      server
        .get("/knn_distance", {
          params: { subject_index: subject.index },
        })
        .then((response: AxiosResponse<number[]>) => {
          setDistanceMap(response.data);
          setLoadingDistanceMap(false);
        });
    }
  }, [subject.index, meanAcrossSubjects]);

  // Update neighbours on voxelIndex change
  useEffect(() => {
    if (voxelIndex !== undefined) {
      if (meanAcrossSubjects) {
        server
          .get("/knn_all_subjects", {
            params: { voxel_index: voxelIndex },
          })
          .then((response: AxiosResponse<number[]>) => {
            setKnnIndices(response.data);
          });
      } else if (subject.index !== undefined) {
        server
          .get("/knn", {
            params: { subject_index: subject.index, voxel_index: voxelIndex },
          })
          .then((response: AxiosResponse<number[]>) => {
            setKnnIndices(response.data);
          });
      }
    }
  }, [voxelIndex, subject.index, meanAcrossSubjects]);

  useEffect(() => {
    // Get activation fingerprint for selected voxel
    setLoadingFingerprint(true);
    if (voxelIndex !== undefined) {
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
            label: "Subject",
            inputs: [
              {
                inputType: InputType.SELECT_STRING,
                selectedItem: subject.label,
                items: subjectLabels,
                onChangeCallback: (newValue: string) =>
                  setSubject({ payload: subjectLabels.indexOf(newValue) }),
              },
              {
                inputType: InputType.BUTTON,
                value: meanAcrossSubjects,
                onChangeCallback: () =>
                  setMeanAcrossSubjects(!meanAcrossSubjects),
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
      {loadingContrastMap ? (
        <TextualLoader text="Loading distance map..." />
      ) : null}
      <div className="scene">
        <Colorbar
          colormap={colormaps[colormapName]}
          vmin={distanceMap ? Math.min(...distanceMap) : undefined}
          vmax={distanceMap ? Math.max(...distanceMap) : undefined}
          unit="Voxels"
        />
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(voxelIndex: number) => {
                setVoxelIndex(voxelIndex);
              }}
              colormap={colormaps[colormapName]}
              voxelIndex={voxelIndex}
              surfaceMap={distanceMap}
              wireframe={wireframe}
              markerIndices={knnIndices}
              width={sceneWidth}
              height={sceneHeight}
              hotspots={
                knnIndices.length > 0
                  ? meanAcrossSubjects
                    ? knnIndices.map(
                        (voxelIndex: number, subjectIndex: number) => ({
                          id: `knn-mean-${subjectIndex}`,
                          voxelIndex: voxelIndex,
                          header: `NN ${subjectLabels[subjectIndex]}`,
                          side: "right",
                        })
                      )
                    : [
                        {
                          id: "nn-1",
                          voxelIndex: knnIndices[0],
                          header: `NN-1 (${knnIndices[0]})`,
                          side: "right",
                        },
                      ]
                  : undefined
              }
            />
          )}
        </ParentSize>
      </div>
      {voxelIndex !== undefined ? (
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
      ) : null}
    </div>
  );
};

export default KnnExplorer;
