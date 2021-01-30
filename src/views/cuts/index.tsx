import { Button, Colors, Slider } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import interpolate from "color-interpolate";
import React, { useEffect, useState } from "react";

import { eel } from "App";
import CanvasSlice from "components/canvasSlice";
import CanvasCrosshair from "components/canvasCrosshair";
import Colorbar from "components/colorbar";
import TextualLoader from "components/textualLoader";
import Timeseries from "components/timeseries";
import { stringRenderer } from "constants/index";

import "./style.scss";

const colorString = require("color-string");

interface Position {
  x: number;
  y: number;
  z: number;
}

const CutsExplorer = () => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>();
  const [images, setImages] = useState<string[]>([]);
  const [image, setImage] = useState<string>();
  const [position, setPosition] = useState<Position>({
    x: 0.5,
    y: 0.5,
    z: 0.3,
  });
  const [t, setT] = useState(0);
  const [loadingSagital, setLoadingSagital] = useState(false);
  const [loadingCoronal, setLoadingCoronal] = useState(false);
  const [loadingHorizontal, setLoadingHorizontal] = useState(false);
  const [loadingTimeseries, setLoadingTimeseries] = useState(false);
  const [anatSize, setAnatSize] = useState<number[]>([0, 0, 0]);
  const [anatSagitalSlice, setAnatSagitalSlice] = useState<number[][]>([]);
  const [anatCoronalSlice, setAnatCoronalSlice] = useState<number[][]>([]);
  const [anatHorizontalSlice, setAnatHorizontalSlice] = useState<number[][]>(
    []
  );
  const [contThreshold, setContThreshold] = useState(0.5);
  const [contSize, setContSize] = useState<number[]>([0, 0, 0]);
  const [contRange, setContRange] = useState([0, 1]);
  const [contSagitalSlice, setContSagitalSlice] = useState<number[][]>([]);
  const [contCoronalSlice, setContCoronalSlice] = useState<number[][]>([]);
  const [contHorizontalSlice, setContHorizontalSlice] = useState<number[][]>(
    []
  );
  const [voxelTimeseries, setVoxelTimeseries] = useState<number[]>([]);
  // Some nifti files are rotated
  const [rotatedSagital] = useState(false);

  useEffect(() => {
    eel.get_subject_list()((subjects: string[]) => {
      setSubjects(subjects);
    });
  }, []);

  useEffect(() => {
    if (subject !== undefined) {
      setImage(undefined);
      eel.get_functional_image_names(subject)((names: string[]) => {
        setImages(names);
      });
    }
  }, [subject]);

  useEffect(() => {
    if (subject !== undefined && image !== undefined) {
      eel.get_functional_range(
        subject,
        image
      )((range: number[]) => {
        setContRange(range);
      });
      eel.get_functional_shape(
        subject,
        image
      )((shape: number[]) => {
        setContSize(shape);
      });
      eel.get_anatomical_shape(subject)((shape: number[]) => {
        setAnatSize(shape);
      });
    }
  }, [subject, image]);

  // Get voxel timeseries
  useEffect(() => {
    if (subject !== undefined && image !== undefined) {
      setLoadingTimeseries(true);
      eel.get_voxel_timeseries(
        subject,
        image,
        Math.floor(position.x * contSize[0]),
        Math.floor(position.y * contSize[1]),
        Math.floor(position.z * contSize[2])
      )((timeseries: number[]) => {
        setVoxelTimeseries(timeseries);
        setLoadingTimeseries(false);
      });
    }
  }, [subject, image, position.x, position.y, position.z, contSize]);

  // Set logic for updating slices on x,y,z-change
  useEffect(() => {
    if (subject !== undefined && image !== undefined) {
      setLoadingSagital(true);
      const anat = eel.get_anatomical_sagital(
        subject,
        Math.floor(position.x * anatSize[0])
      )();
      const contrast = eel.get_functional_sagital(
        subject,
        image,
        Math.floor(position.x * contSize[0]),
        t
      )();
      Promise.all([anat, contrast]).then((values) => {
        setAnatSagitalSlice(values[0]);
        setContSagitalSlice(values[1]);
        setLoadingSagital(false);
      });
    }
  }, [subject, image, position.x, t, anatSize, contSize]);

  useEffect(() => {
    if (subject !== undefined && image !== undefined) {
      setLoadingCoronal(true);
      const anat = eel.get_anatomical_coronal(
        subject,
        Math.floor(position.y * anatSize[1])
      )();
      const contrast = eel.get_functional_coronal(
        subject,
        image,
        Math.floor(position.y * contSize[1]),
        t
      )();
      Promise.all([anat, contrast]).then((values) => {
        setAnatCoronalSlice(values[0]);
        setContCoronalSlice(values[1]);
        setLoadingCoronal(false);
      });
    }
  }, [subject, image, position.y, t, anatSize, contSize]);

  useEffect(() => {
    if (subject !== undefined && image !== undefined) {
      setLoadingHorizontal(true);
      const anat = eel.get_anatomical_horizontal(
        subject,
        Math.floor(position.z * anatSize[2])
      )();
      const contrast = eel.get_functional_horizontal(
        subject,
        image,
        Math.floor(position.z * contSize[2]),
        t
      )();
      Promise.all([anat, contrast]).then((values) => {
        setAnatHorizontalSlice(values[0]);
        setContHorizontalSlice(values[1]);
        setLoadingHorizontal(false);
      });
    }
  }, [subject, image, position.z, t, anatSize, contSize]);

  const SelectSubject = Select.ofType<string>();
  const SelectSequence = Select.ofType<string>();

  const color1 = Colors.VERMILION1;
  const color2 = Colors.GOLD5;
  const colormap = (i: number) =>
    colorString.get.rgb(interpolate([color1, color2])(i));

  return (
    <div className="slice-container">
      <div className="controls">
        <div className="item">
          <div className="item-label">Subject</div>
          <div className="item-value">
            <SelectSubject
              filterable={false}
              items={subjects}
              itemRenderer={stringRenderer}
              onItemSelect={(item: string) => {
                setSubject(item);
              }}
            >
              <Button rightIcon="double-caret-vertical" text={subject} />
            </SelectSubject>
          </div>
        </div>
        <div className="item">
          <div className="item-label">Image</div>
          <div className="item-value">
            <SelectSequence
              filterable={false}
              items={images}
              itemRenderer={stringRenderer}
              onItemSelect={(item: string) => {
                setImage(item);
              }}
            >
              <Button rightIcon="double-caret-vertical" text={image} />
            </SelectSequence>
          </div>
        </div>
        <div className="item">
          <div className="item-label">Threshold</div>
          <div className="item-value">
            <Slider
              min={0}
              max={1}
              stepSize={0.1}
              labelStepSize={10}
              onChange={(newThreshold: number) => {
                setContThreshold(newThreshold);
              }}
              value={contThreshold}
            />
          </div>
        </div>
      </div>
      <div className="slices">
        <div className="slices-grid">
          <ParentSize>
            {({ width, height }) => (
              <>
                {loadingSagital ? <TextualLoader text="Loading..." /> : null}
                <CanvasSlice
                  image={anatSagitalSlice}
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                />
                <CanvasSlice
                  image={contSagitalSlice}
                  height={(Math.min(height, width) * contSize[0]) / anatSize[0]}
                  width={Math.min(height, width)}
                  alpha={0.8}
                  color1={color1}
                  color2={color2}
                  threshold={contThreshold}
                  range={contRange}
                />
                {anatSagitalSlice.length > 0 ? (
                  <CanvasCrosshair
                    height={Math.min(height, width)}
                    width={Math.min(height, width)}
                    x={rotatedSagital ? position.z : position.y}
                    y={rotatedSagital ? position.y : position.z}
                    changeCallback={(newX: number, newY: number) => {
                      if (rotatedSagital) {
                        setPosition({
                          x: position.x,
                          y: newY,
                          z: newX,
                        });
                      } else {
                        setPosition({
                          x: position.x,
                          y: newX,
                          z: newY,
                        });
                      }
                    }}
                  />
                ) : null}
                <div className="slice-label">x: {position.x.toFixed(3)}</div>
              </>
            )}
          </ParentSize>
          <ParentSize>
            {({ width, height }) => (
              <>
                {loadingCoronal ? <TextualLoader text="Loading..." /> : null}
                <CanvasSlice
                  image={anatCoronalSlice}
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                />
                <CanvasSlice
                  image={contCoronalSlice}
                  height={(Math.min(height, width) * contSize[1]) / anatSize[1]}
                  width={Math.min(height, width)}
                  alpha={0.8}
                  color1={color1}
                  color2={color2}
                  threshold={contThreshold}
                  range={contRange}
                />
                {anatCoronalSlice.length > 0 ? (
                  <CanvasCrosshair
                    height={Math.min(height, width)}
                    width={Math.min(height, width)}
                    x={position.x}
                    y={position.z}
                    changeCallback={(newX: number, newY: number) => {
                      setPosition({
                        x: newX,
                        y: position.y,
                        z: newY,
                      });
                    }}
                  />
                ) : null}
                <div className="slice-label">y: {position.y.toFixed(3)}</div>
              </>
            )}
          </ParentSize>
          <ParentSize>
            {({ width, height }) => (
              <>
                {loadingHorizontal ? <TextualLoader text="Loading..." /> : null}
                <CanvasSlice
                  image={anatHorizontalSlice}
                  height={Math.min(height, width)}
                  width={Math.min(height, width)}
                />
                <CanvasSlice
                  image={contHorizontalSlice}
                  height={(Math.min(height, width) * contSize[2]) / anatSize[2]}
                  width={Math.min(height, width)}
                  alpha={0.8}
                  color1={color1}
                  color2={color2}
                  threshold={contThreshold}
                  range={contRange}
                />
                {anatHorizontalSlice.length > 0 ? (
                  <CanvasCrosshair
                    height={Math.min(height, width)}
                    width={Math.min(height, width)}
                    x={position.x}
                    y={position.y}
                    changeCallback={(newX: number, newY: number) => {
                      setPosition({
                        x: newX,
                        y: newY,
                        z: position.z,
                      });
                    }}
                  />
                ) : null}
                <div className="slice-label">z: {position.z.toFixed(3)}</div>
              </>
            )}
          </ParentSize>
        </div>
        <Colorbar
          colormap={colormap}
          vmin={contThreshold ? contRange[1] * contThreshold : contRange[0]}
          vmax={contRange[1]}
        />
      </div>
      <div className={"slice-information"}>
        <ParentSize>
          {({ width, height }) => (
            <Timeseries
              loading={loadingTimeseries}
              clickCallback={(t: number) => setT(t)}
              timeseries={voxelTimeseries}
              selectedT={t}
              range={contRange}
              height={height}
              width={width}
            />
          )}
        </ParentSize>
      </div>
    </div>
  );
};

export default CutsExplorer;
