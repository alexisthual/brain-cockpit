import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosError, AxiosResponse } from "axios";
import { useEffect, useRef, useState } from "react";

import { server } from "App";
import Colorbar from "components/colorbar";
import PaneControls, { InputType } from "components/paneControls";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import { colormaps, getMin, getMax, MeshType } from "constants/index";

import { AlignmentViewState, AlignmentIntent, AlignmentRole } from "../index";

interface Props {
  alignmentState: AlignmentViewState;
  setAlignmentState: (AlignmentViewState: any) => void;
  paneRole: AlignmentRole;
  paneIntent: AlignmentIntent;
  colormapName?: string;
  subjectLabels: string[];
  showGridHelper?: boolean;
  paneLabel?: string;
}

const AlignmentPane = ({
  alignmentState,
  setAlignmentState = () => {},
  paneRole,
  paneIntent,
  colormapName = "viridis",
  subjectLabels = [],
  showGridHelper,
  paneLabel,
}: Props) => {
  const [surfaceMap, setSurfaceMap] = useState<number[] | undefined>();
  const [loadingSurfaceMap, setLoadingSurfaceMap] = useState(false);
  const [wireframe] = useState(false);
  const panelEl = useRef<HTMLDivElement>(null);

  const oppositeRole = paneRole === "source" ? "target" : "source";

  // Set key events

  // If ALT is pressed, dispatch event for all panes,
  // otherwise, dispatch event for current pane

  // I
  // const incrementSubject = useCallback(
  //   (event: any) => {
  //     if (event.target.matches("input")) return;
  //
  //     if (panelEl.current !== null && panelEl.current.matches(":hover")) {
  //       if (event.isComposing || (event.keyCode === 73 && event.altKey)) {
  //         paneCallbacks?.shiftAllPanes("subject", 1, subjectLabels.length);
  //       } else if (event.isComposing || event.keyCode === 73) {
  //         changeState("subject")(
  //           modulo(alignmentState.subject + 1, subjectLabels.length)
  //         );
  //       }
  //     }
  //   },
  //   [alignmentState.subject, subjectLabels, paneCallback]
  // );
  //
  // // K
  // const decrementSubject = useCallback(
  //   (event: any) => {
  //     if (event.target.matches("input")) return;
  //
  //     if (panelEl.current !== null && panelEl.current.matches(":hover")) {
  //       if (event.isComposing || (event.keyCode === 75 && event.altKey)) {
  //         paneCallbacks?.shiftAllPanes("subject", -1, subjectLabels.length);
  //       } else if (event.isComposing || event.keyCode === 75) {
  //         if (!alignmentState.meanSurfaceMap) {
  //           changeState("subject")(
  //             modulo(alignmentState.subject - 1, subjectLabels.length)
  //           );
  //         }
  //       }
  //     }
  //   },
  //   [
  //     alignmentState.subject,
  //     alignmentState.meanSurfaceMap,
  //     subjectLabels,
  //     paneCallbacks,
  //     changeState,
  //   ]
  // );

  // useEffect(() => {
  //   window.addEventListener("keydown", incrementSubject);
  //   window.addEventListener("keydown", decrementSubject);
  //   return () => {
  //     window.removeEventListener("keydown", incrementSubject);
  //     window.removeEventListener("keydown", decrementSubject);
  //   };
  // }, [
  //   incrementSubject,
  //   decrementSubject,
  // ]);

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
            .get("/alignments/single_voxel", {
              params: {
                source: alignmentState.source.subject,
                target: alignmentState.target.subject,
                hemi: alignmentState.hemi,
                mesh: alignmentState.meshSupport,
                voxel: voxel,
                role: paneRole,
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
      case AlignmentIntent.TRUE_CONTRAST:
        if (alignmentState.contrast !== undefined) {
          server
            .get("/ibc/contrast", {
              params: {
                subject_index: alignmentState[paneRole].subject,
                contrast_index: alignmentState.contrast,
                hemi: alignmentState.hemi,
                mesh: alignmentState.meshSupport,
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
      case AlignmentIntent.ALIGNED_CONTRAST:
        if (alignmentState.contrast !== undefined) {
          server
            .get("/alignments/contrast", {
              params: {
                source: alignmentState.source.subject,
                target: alignmentState.target.subject,
                hemi: alignmentState.hemi,
                mesh: alignmentState.meshSupport,
                contrast: alignmentState.contrast,
                role: paneRole,
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
    alignmentState,
    alignmentState.source.subject,
    alignmentState.target.subject,
    alignmentState[oppositeRole].selectedVoxel,
    alignmentState.hemi,
    alignmentState.meshSupport,
    alignmentState.contrast,
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
                label: "Subject",
                inputs: [
                  {
                    inputType: InputType.SELECT_STRING,
                    selectedItem:
                      subjectLabels[alignmentState[paneRole].subject],
                    items: subjectLabels,
                    onChangeCallback: (newValue: string) => {
                      const newState = {
                        ...alignmentState,
                        [paneRole]: {
                          ...alignmentState[paneRole],
                          subject: subjectLabels.indexOf(newValue),
                        },
                      };

                      setAlignmentState(newState);
                    },
                  },
                ],
              },
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
              meshType={MeshType.PIAL}
              meshSupport={alignmentState.meshSupport}
              subjectLabel={subjectLabels[alignmentState[paneRole].subject]}
              hemi={alignmentState.hemi}
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
