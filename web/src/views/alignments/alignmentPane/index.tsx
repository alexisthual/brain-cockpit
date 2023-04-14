import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosError, AxiosResponse } from "axios";
import { useEffect, useRef, useState } from "react";

import { server } from "App";
import Colorbar from "components/colorbar";
import PaneControls, { InputType } from "components/paneControls";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import { colormaps, getMin, getMax } from "constants/index";

import { AlignmentViewState, AlignmentIntent, AlignmentRole } from "../index";

interface Props {
  datasetId: string;
  alignmentState: AlignmentViewState;
  setAlignmentState: (AlignmentViewState: any) => void;
  paneRole: AlignmentRole;
  paneIntent: AlignmentIntent;
  colormapName?: string;
  showGridHelper?: boolean;
  paneLabel?: string;
}

const AlignmentPane = ({
  datasetId,
  alignmentState,
  setAlignmentState = () => {},
  paneRole,
  paneIntent,
  colormapName = "viridis",
  showGridHelper,
  paneLabel,
}: Props) => {
  const [surfaceMap, setSurfaceMap] = useState<number[] | undefined>();
  const [loadingSurfaceMap, setLoadingSurfaceMap] = useState(false);
  const [wireframe] = useState(false);
  const panelEl = useRef<HTMLDivElement>(null);

  const oppositeRole = paneRole === "source" ? "target" : "source";
  // Voxel index of interest depends on pane role.
  // If pane role is source, take target selectedVoxel,
  // otherwise, take source selectedVoxel.
  const selectedVoxelOpposidePanel = alignmentState[oppositeRole].selectedVoxel;

  // Update surface map when subject changes
  useEffect(() => {
    setLoadingSurfaceMap(true);

    switch (paneIntent) {
      case AlignmentIntent.SINGLE_VOXEL:
        if (selectedVoxelOpposidePanel !== undefined) {
          server
            .get(`/alignments/${datasetId}/single_voxel`, {
              params: {
                voxel: selectedVoxelOpposidePanel,
                role: paneRole,
                model_id: alignmentState.modelId,
              },
            })
            .then((response: AxiosResponse<number[]>) => {
              setSurfaceMap(response.data);
              setLoadingSurfaceMap(false);
            })
            .catch((error: AxiosError) => {
              console.error(error);
              setSurfaceMap(undefined);
              setLoadingSurfaceMap(false);
            });
        } else {
          setLoadingSurfaceMap(false);
        }
        break;
      default:
        setLoadingSurfaceMap(false);
        break;
    }
  }, [
    datasetId,
    alignmentState.modelId,
    selectedVoxelOpposidePanel,
    paneRole,
    paneIntent,
    oppositeRole,
  ]);

  return (
    <div className="scene-pane">
      {paneLabel ? <div className="scene-pane-label">{paneLabel}</div> : null}
      <div className="scene" ref={panelEl}>
        {paneIntent === AlignmentIntent.SINGLE_VOXEL ? (
          <PaneControls
            rows={[
              {
                label: "Voxel",
                inputs: [
                  {
                    inputType: InputType.LABEL,
                    value: alignmentState[paneRole].selectedVoxel?.toString(),
                  },
                ],
              },
            ]}
          />
        ) : null}
        {loadingSurfaceMap ? (
          <TextualLoader text="Loading surface map..." />
        ) : null}
        <Colorbar
          colormap={colormaps[colormapName]}
          vmin={getMin(surfaceMap)}
          vmax={getMax(surfaceMap)}
          unit={""}
        />
        <ParentSize className="scene-container" debounceTime={10}>
          {({ width: sceneWidth, height: sceneHeight }) => (
            <Scene
              clickedVoxelCallback={(voxelIndex: number) => {
                const newState = {
                  ...alignmentState,
                  [paneRole]: {
                    ...alignmentState[paneRole],
                    selectedVoxel: voxelIndex,
                  },
                };

                setAlignmentState(newState);
              }}
              colormap={colormaps[colormapName]}
              voxelIndex={alignmentState[paneRole].selectedVoxel}
              surfaceMap={surfaceMap}
              meshUrls={
                alignmentState[paneRole].meshPath !== undefined
                  ? [
                      `alignments/${datasetId}/${alignmentState.modelId}/mesh/${alignmentState[paneRole].meshPath}`,
                    ]
                  : undefined
              }
              wireframe={wireframe}
              width={sceneWidth}
              height={sceneHeight}
              thresholdLow={0}
              thresholdHigh={0}
              showGridHelper={showGridHelper}
            />
          )}
        </ParentSize>
      </div>
      <div className="scene-pane-hover-bar"></div>
    </div>
  );
};

export default AlignmentPane;
