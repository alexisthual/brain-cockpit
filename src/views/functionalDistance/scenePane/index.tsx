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
  HemisphereSide,
  SurfaceMapType,
  Metric,
  Subject,
} from "constants/index";
import PaneButtons from "./buttons";

interface Props {
  closeCallback: () => void;
  subjectLabels: string[];
  sharedState: boolean;
  sharedSubject?: Subject;
  sharedSurfaceMap?: number[];
  sharedMeanSurfaceMap: boolean;
  sharedVoxelIndex?: number;
  setSharedVoxelIndex?: (voxelIndex: number) => void;
  sharedWireframe: boolean;
  sharedSurfaceMapType: SurfaceMapType;
  sharedMetric: Metric;
  lowThresholdMin?: number;
  lowThresholdMax?: number;
  highThresholdMin?: number;
  highThresholdMax?: number;
}

const ScenePane = ({
  closeCallback = () => {},
  subjectLabels = [],
  sharedState = false,
  sharedSubject,
  sharedSurfaceMap,
  sharedMeanSurfaceMap = false,
  sharedVoxelIndex,
  setSharedVoxelIndex = () => {},
  sharedWireframe = false,
  sharedSurfaceMapType = SurfaceMapType.SEED_BASED,
  sharedMetric = Metric.COSINE,
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
  const [surfaceMapType, setSurfaceMapType] = useState(
    SurfaceMapType.SEED_BASED
  );
  const [metric, setMetric] = useState(Metric.COSINE);
  const panelEl = useRef<HTMLDivElement>(null);
  const [functionalDistances, setFunctionalDistances] = useState<number[]>([]);
  const [loadingFunctionalDistances, setLoadingFunctionalDistances] = useState(
    false
  );
  const [meanFunctionalDistance, setMeanFunctionalDistance] = useState(false);

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

  // Set key events

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
    <div className="scene" ref={panelEl}>
      <PaneButtons closeCallback={closeCallback} />
      {!sharedState ? (
        <InfoPanel
          rows={[
            {
              label: "Metric",
              inputs: [
                {
                  value: sharedState ? sharedMetric : metric,
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
                  title: "Mean across subjects",
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
            voxelIndex={sharedState ? sharedVoxelIndex : voxelIndex}
            surfaceMap={sharedState ? sharedSurfaceMap : surfaceMap}
            hemi={HemisphereSide.LEFT}
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
