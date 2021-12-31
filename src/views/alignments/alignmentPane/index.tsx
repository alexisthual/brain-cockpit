import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosError, AxiosResponse } from "axios";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { server } from "App";
import Colorbar from "components/colorbar";
import PaneControls, { InputType } from "components/paneControls";
import Scene from "components/scene";
import TextualLoader from "components/textualLoader";
import { colormaps, MeshType, modulo } from "constants/index";

import { AlignmentViewState } from "../index";
import "./style.scss";

interface Props {
  alignmentState: AlignmentViewState;
  setAlignmentState: (AlignmentViewState: any) => void;
  paneRole: "source" | "target";
  colormapName?: string;
  subjectLabels: string[];
  showGridHelper?: boolean;
}

const AlignmentPane = ({
  alignmentState,
  setAlignmentState = () => {},
  paneRole,
  colormapName = "single_diverging_heat",
  subjectLabels = [],
  showGridHelper,
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

    // Voxel index of interest depends on pane role.
    // If pane role is source, take target selectedVoxel,
    // otherwise, take source selectedVoxel.
    const voxel = alignmentState[oppositeRole].selectedVoxel;

    if (voxel !== undefined) {
      server
        .get("/alignments/alignment", {
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
  }, [
    alignmentState.source.subject,
    alignmentState.target.subject,
    alignmentState[oppositeRole].selectedVoxel,
    alignmentState.hemi,
    alignmentState.meshSupport,
    paneRole,
    oppositeRole,
  ]);

  return (
    <div className="surface-pane scene" ref={panelEl}>
      <PaneControls
        rows={[
          {
            label: "Subject",
            inputs: [
              {
                inputType: InputType.SELECT_STRING,
                value: subjectLabels[alignmentState[paneRole].subject],
                values: subjectLabels,
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
            lowThresholdMin={0}
            lowThresholdMax={0}
            highThresholdMin={0}
            highThresholdMax={1}
            showGridHelper={showGridHelper}
          />
        )}
      </ParentSize>
    </div>
  );
};

export default AlignmentPane;
