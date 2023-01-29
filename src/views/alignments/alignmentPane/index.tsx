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
  // Update surface map when subject changes
  useEffect(() => {
    setLoadingSurfaceMap(true);

    switch (paneIntent) {
      case AlignmentIntent.SINGLE_VOXEL:
        // Voxel index of interest depends on pane role.
        // If pane role is source, take target selectedVoxel,
        // otherwise, take source selectedVoxel.
        const voxel = alignmentState[oppositeRole].selectedVoxel;

        if (voxel !== undefined) {
          server
            .get(`/alignments/${datasetId}/single_voxel`, {
              params: {
                voxel: voxel,
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
      // case AlignmentIntent.TRUE_CONTRAST:
      //   if (alignmentState.contrast !== undefined) {
      //     server
      //       .get("/datasets/ibc/contrast", {
      //         params: {
      //           contrast_index: alignmentState.contrast,
      //         },
      //       })
      //       .then((response: AxiosResponse<number[]>) => {
      //         setSurfaceMap(response.data);
      //         setLoadingSurfaceMap(false);
      //       })
      //       .catch((error: AxiosError) => {
      //         console.error(error);
      //         setSurfaceMap(undefined);
      //         setLoadingSurfaceMap(false);
      //       });
      //   } else {
      //     setLoadingSurfaceMap(false);
      //   }
      //   break;
      // case AlignmentIntent.ALIGNED_CONTRAST:
      //   if (alignmentState.contrast !== undefined) {
      //     server
      //       .get("/alignments/contrast", {
      //         params: {
      //           source: alignmentState.source.subject,
      //           target: alignmentState.target.subject,
      //           hemi: alignmentState.hemi,
      //           mesh: alignmentState.meshSupport,
      //           contrast: alignmentState.contrast,
      //           role: paneRole,
      //           model: alignmentState.model,
      //         },
      //       })
      //       .then((response: AxiosResponse<number[]>) => {
      //         setSurfaceMap(response.data);
      //         setLoadingSurfaceMap(false);
      //       })
      //       .catch((error: AxiosError) => {
      //         console.error(error);
      //         setSurfaceMap(undefined);
      //         setLoadingSurfaceMap(false);
      //       });
      //   } else {
      //     setLoadingSurfaceMap(false);
      //   }
      //   break;
      default:
        setLoadingSurfaceMap(false);
        break;
    }
  }, [
    datasetId,
    alignmentState.modelId,
    alignmentState[oppositeRole].selectedVoxel,
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
          vmin={0}
          vmax={1}
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
              lowThresholdMin={getMin(surfaceMap)}
              lowThresholdMax={0}
              highThresholdMin={0}
              highThresholdMax={getMax(surfaceMap)}
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
