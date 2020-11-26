import React from "react";
import "./style.scss";

interface IProps {
  subjectLabels: string[];
  subject?: string;
  contrast?: string;
  contrastIndex?: number;
  voxelIndex?: number;
  subjectChangeCallback: (subjectIndex: number) => void;
}

const Header = ({
  subjectLabels,
  subject,
  contrast,
  contrastIndex,
  voxelIndex,
  subjectChangeCallback = () => {},
}: IProps) => {
  return (
    <div id="header">
      <div className="header-item-label">Subject</div>
      <div className="header-item-value">
        <form>
          <label>
            <select
              value={subject}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                subjectChangeCallback(subjectLabels.indexOf(event.target.value))
              }
            >
              {subjectLabels.map((s, index) => {
                return (
                  <option key={s} value={s}>
                    {s}
                  </option>
                );
              })}
            </select>
          </label>
        </form>
      </div>
      <div className="header-item-label">Contrast</div>
      <div className="header-item-value">
        {contrast} ({contrastIndex})
      </div>
      <div className="header-item-label">Voxel</div>
      <div className="header-item-value">{voxelIndex}</div>
    </div>
  );
};

export default Header;
