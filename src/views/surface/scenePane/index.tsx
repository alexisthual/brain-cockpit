import ParentSize from "@visx/responsive/lib/components/ParentSize";
import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { eel } from "App";
import InfoPanel from "components/infoPanel";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import {
  ActionLabel,
  Contrast,
  colormaps,
  HemisphereSide,
  MeshType,
  Subject,
} from "constants/index";
import PaneButtons from "./buttons";

interface Props {
  closeCallback: () => void;
  subjectLabels: string[];
  contrastLabels: string[];
  sharedState: boolean;
  sharedSubject?: Subject;
  sharedContrast?: Contrast;
  sharedSurfaceMap?: number[];
  sharedMeanSurfaceMap: boolean;
  sharedVoxelIndex?: number;
  setSharedVoxelIndex?: (voxelIndex: number) => void;
  sharedWireframe: boolean;
  sharedMeshType: MeshType;
  sharedHemi: HemisphereSide;
  lowThresholdMin?: number;
  lowThresholdMax?: number;
  highThresholdMin?: number;
  highThresholdMax?: number;
}

const ScenePane = ({
  closeCallback = () => {},
  subjectLabels = [],
  contrastLabels = [],
  sharedState = false,
  sharedSubject,
  sharedContrast,
  sharedSurfaceMap,
  sharedMeanSurfaceMap = false,
  sharedVoxelIndex,
  setSharedVoxelIndex = () => {},
  sharedWireframe = false,
  sharedMeshType = MeshType.PIAL,
  sharedHemi = HemisphereSide.LEFT,
  lowThresholdMin,
  lowThresholdMax,
  highThresholdMin,
  highThresholdMax,
}: Props) => {
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [surfaceMap, setSurfaceMap] = useState<number[] | undefined>();
  const [loadingSurfaceMap, setLoadingSurfaceMap] = useState(false);
  const [meanSurfaceMap, setMeanSurfaceMap] = useState(false);
  const [wireframe] = useState(false);
  const [meshType, setMeshType] = useState(MeshType.PIAL);
  const [hemi, setHemi] = useState(HemisphereSide.LEFT);
  const panelEl = useRef<HTMLDivElement>(null);

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
  if (subjectLabels.length > 0 && subject.index === undefined) {
    setSubject({ payload: 0 });
  }

  const contrastReducer = (state: Contrast, action: ActionLabel): Contrast => {
    let newIndex = state.index;
    let n = contrastLabels.length;
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
      label: contrastLabels[newIndex],
    };
  };
  const [contrast, setContrast] = useReducer(contrastReducer, {} as Contrast);
  if (contrastLabels.length > 0 && contrast.index === undefined) {
    setContrast({ payload: 0 });
  }

  // Set key events

  // L
  const incrementContrast = useCallback(
    (event: any) => {
      if (event.isComposing || event.keyCode === 76) {
        if (!sharedState) {
          setContrast({ type: "increment" });
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", incrementContrast);
    return () => window.removeEventListener("keydown", incrementContrast);
  }, [incrementContrast]);

  // J
  const decrementContrast = useCallback(
    (event: any) => {
      if (event.isComposing || event.keyCode === 74) {
        if (!sharedState) {
          setContrast({ type: "decrement" });
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", decrementContrast);
    return () => window.removeEventListener("keydown", decrementContrast);
  }, [decrementContrast]);

  // I
  const incrementSubject = useCallback(
    (event: any) => {
      if (event.isComposing || event.keyCode === 73) {
        if (!sharedState && !meanSurfaceMap) {
          setSubject({ type: "increment" });
        }
      }
    },
    [sharedState, meanSurfaceMap]
  );
  useEffect(() => {
    window.addEventListener("keydown", incrementSubject);
    return () => window.removeEventListener("keydown", incrementSubject);
  }, [incrementSubject]);

  // K
  const decrementSubject = useCallback(
    (event: any) => {
      if (event.isComposing || event.keyCode === 75) {
        if (!sharedState && !meanSurfaceMap) {
          setSubject({ type: "decrement" });
        }
      }
    },
    [sharedState, meanSurfaceMap]
  );
  useEffect(() => {
    window.addEventListener("keydown", decrementSubject);
    return () => window.removeEventListener("keydown", decrementSubject);
  }, [decrementSubject]);

  // U
  const toggleMeanContrastMap = useCallback(
    (event: any) => {
      if (event.isComposing || event.keyCode === 85) {
        if (!sharedState) {
          setMeanSurfaceMap((prevMeanSurfaceMap) => !prevMeanSurfaceMap);
        }
      }
    },
    [sharedState]
  );
  useEffect(() => {
    window.addEventListener("keydown", toggleMeanContrastMap);
    return () => window.removeEventListener("keydown", toggleMeanContrastMap);
  }, [toggleMeanContrastMap]);

  // X
  const closePane = useCallback(
    (event: any) => {
      if (
        (event.isComposing || event.keyCode === 88) &&
        panelEl.current !== null &&
        panelEl.current.matches(":hover")
      ) {
        closeCallback();
      }
    },
    [closeCallback]
  );
  useEffect(() => {
    window.addEventListener("keydown", closePane);
    return () => window.removeEventListener("keydown", closePane);
  }, [closePane]);

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (contrast.index !== undefined) {
      setLoadingSurfaceMap(true);
      if (meanSurfaceMap) {
        eel.get_contrast_mean(
          contrast.index,
          hemi
        )((surfaceMap: number[]) => {
          setSurfaceMap(surfaceMap);
          setLoadingSurfaceMap(false);
        });
      } else if (subject.index !== undefined) {
        eel.get_contrast(
          subject.index,
          contrast.index,
          hemi
        )((surfaceMap: number[]) => {
          setSurfaceMap(surfaceMap);
          setLoadingSurfaceMap(false);
        });
      } else {
        setLoadingSurfaceMap(false);
      }
    }
  }, [subject, contrast, meanSurfaceMap, hemi]);

  return (
    <div className="scene" ref={panelEl}>
      <PaneButtons closeCallback={closeCallback} />
      {!sharedState ? (
        <InfoPanel
          rows={[
            {
              label: "Mesh Type",
              inputs: [
                {
                  value: sharedState ? sharedMeshType : meshType,
                  values: Object.keys(MeshType),
                  onChangeCallback: (newValue: string) =>
                    setMeshType(MeshType[newValue as keyof typeof MeshType]),
                },
              ],
            },
            {
              label: "Hemi",
              inputs: [
                {
                  value: sharedState ? sharedHemi : hemi,
                  values: Object.keys(HemisphereSide),
                  onChangeCallback: (newValue: string) =>
                    setHemi(
                      HemisphereSide[newValue as keyof typeof HemisphereSide]
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
                  title: "Mean across subjects",
                },
              ],
            },
            {
              label: "Contrast",
              inputs: [
                {
                  value: contrast.label,
                  values: contrastLabels,
                  onChangeCallback: (newValue: string) =>
                    setContrast({ payload: contrastLabels.indexOf(newValue) }),
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
      {loadingSurfaceMap ? (
        <TextualLoader text="Loading surface map..." />
      ) : null}
      <ParentSize className="scene-container" debounceTime={10}>
        {({ width: sceneWidth, height: sceneHeight }) => (
          <Scene
            clickedVoxelCallback={(voxelIndex: number) => {
              if (sharedState) {
                setSharedVoxelIndex(voxelIndex);
              } else {
                setVoxelIndex(voxelIndex);
              }
            }}
            colormap={colormaps["diverging"]}
            voxelIndex={sharedState ? sharedVoxelIndex : voxelIndex}
            surfaceMap={sharedState ? sharedSurfaceMap : surfaceMap}
            meshType={sharedState ? sharedMeshType : meshType}
            hemi={sharedState ? sharedHemi : hemi}
            wireframe={sharedState ? sharedWireframe : wireframe}
            width={sceneWidth}
            height={sceneHeight}
            lowThresholdMin={lowThresholdMin}
            lowThresholdMax={lowThresholdMax}
            highThresholdMin={highThresholdMin}
            highThresholdMax={highThresholdMax}
          />
        )}
      </ParentSize>
    </div>
  );
};

export default ScenePane;
