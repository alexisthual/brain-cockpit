import React from "react";
import "./style.scss";

interface IProps {
  label: string;
  value: any;
}

const HeaderItem = ({ label, value }: IProps) => {
  return (
    <>
      <div className="header-item-label">
        <p>{label}</p>
      </div>
      <div className="header-item-value">
        <p>{value}</p>
      </div>
    </>
  );
};

export default HeaderItem;
