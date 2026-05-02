import React from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";

export default function LandingPage() {

  const router=useNavigate();

  return (
    <div className="landingPageContainer">
      <nav>
        <div className="navHeader">
          <h2>Mi Gente</h2>
        </div>
        <div className="navList">
          <p
            onClick={() => {
              router("/ahjdd123");
            }}
          >
            Join As Guest
          </p>
          <p
            onClick={() => {
              router("/auth");
            }}
          >
            Register
          </p>
          <div
            onClick={() => {
              router("/auth");
            }}
            role="button"
          >
            <p>LogIn</p>
          </div>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div>
          <h1>
            <span style={{ color: "#6B39A1" }}>Connect</span> With Your Loved
            Ones
          </h1>
          <p>
            Cover a distance with{" "}
            <span style={{ color: "#9a2d1d", fontWeight: 700 }}>
              Mi Gente
            </span>{" "}
          </p>
          <div role="button">
            <Link to={"/auth"}>Get Started</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
