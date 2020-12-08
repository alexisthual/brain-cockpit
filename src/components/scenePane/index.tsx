import ParentSize from "@visx/responsive/lib/components/ParentSize";
import React, { useEffect, useReducer, useState } from "react";

import { eel } from "App";
import InfoPanel from "components/infoPanel";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import {
  Contrast,
  HemisphereSide,
  HemisphereSideString,
  MeshType,
  MeshTypeString,
  Subject,
} from "constants/index";

type ActionLabel = {
  type?: "increment" | "decrement";
  payload?: number;
};

interface Props {
  subjectLabels: string[];
  contrastLabels: string[];
  sharedState: boolean;
  sharedSubject: Subject;
  sharedContrast: Contrast;
  sharedContrastMap?: number[];
  sharedMeanContrastMap: boolean;
  sharedVoxelIndex?: number;
  setSharedVoxelIndex?: (voxelIndex: number) => void;
  sharedWireframe: boolean;
  sharedMeshType: MeshType;
  sharedHemi: HemisphereSide;
}

const ScenePane = ({
  subjectLabels = [],
  contrastLabels = [],
  sharedState = false,
  sharedSubject = {},
  sharedContrast = {},
  sharedContrastMap = [],
  sharedMeanContrastMap = false,
  sharedVoxelIndex,
  setSharedVoxelIndex = () => {},
  sharedWireframe = false,
  sharedMeshType = MeshType.PIAL,
  sharedHemi = HemisphereSide.LEFT,
}: Props) => {
  const [voxelIndex, setVoxelIndex] = useState<number | undefined>();
  const [contrastMap, setContrastMap] = useState<number[] | undefined>();
  const [loadingContrastMap, setLoadingContrastMap] = useState(false);
  const [meanContrastMap, setMeanContrastMap] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [meshType, setMeshType] = useState(MeshType.PIAL);
  const [hemi, setHemi] = useState(HemisphereSide.LEFT);

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

  // Update contrast map when subject or contrast change
  useEffect(() => {
    if (contrast.index !== undefined) {
      setLoadingContrastMap(true);
      if (meanContrastMap) {
        eel.get_contrast_mean(
          contrast.index,
          hemi
        )((contrastMap: number[]) => {
          setContrastMap(contrastMap);
          setLoadingContrastMap(false);
        });
      } else if (subject.index !== undefined) {
        eel.get_contrast(
          subject.index,
          contrast.index,
          hemi
        )((contrastMap: number[]) => {
          setContrastMap(contrastMap);
          setLoadingContrastMap(false);
        });
      } else {
        setLoadingContrastMap(false);
      }
    }
  }, [subject, contrast, meanContrastMap, hemi]);

  return (
    <div className="scene">
      {!sharedState ? (
        <InfoPanel
          subjectLabels={subjectLabels}
          subject={sharedState ? sharedSubject.label : subject.label}
          contrast={sharedState ? sharedContrast.label : contrast.label}
          contrastIndex={sharedState ? sharedContrast.index : contrast.index}
          voxelIndex={sharedState ? sharedVoxelIndex : voxelIndex}
          subjectChangeCallback={(subjectIndex: number) => {
            setSubject({ payload: subjectIndex });
          }}
          meanSurfaceMap={sharedState ? sharedMeanContrastMap : meanContrastMap}
          meanChangeCallback={() => {
            setMeanContrastMap(!meanContrastMap);
          }}
          meshType={sharedState ? sharedMeshType : meshType}
          meshTypeLabels={Object.keys(MeshType) as MeshTypeString[]}
          meshTypeChangeCallback={(meshType: MeshType) => {
            setMeshType(meshType);
          }}
          hemi={sharedState ? sharedHemi : hemi}
          hemiLabels={Object.keys(HemisphereSide) as HemisphereSideString[]}
          hemiChangeCallback={(hemi: HemisphereSide) => {
            setHemi(hemi);
          }}
        />
      ) : null}
      {loadingContrastMap ? (
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
            surfaceMap={sharedState ? sharedContrastMap : contrastMap}
            meshType={sharedState ? sharedMeshType : meshType}
            hemi={sharedState ? sharedHemi : hemi}
            wireframe={sharedState ? sharedWireframe : wireframe}
            width={sceneWidth}
            height={sceneHeight}
          />
        )}
      </ParentSize>
    </div>
  );
};

export default ScenePane;
