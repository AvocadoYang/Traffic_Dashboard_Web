import styled from "styled-components";
import ReactDOM from "react-dom";

const LoaderWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999; /* Ensure it's above other elements */
  background: rgba(255, 255, 255, 0.8); /* Slight transparency for better UX */
`;

const Loader = styled.div`
  width: 80px;
  height: 40px;
  display: flex;
  position: relative;

  &::before,
  &::after {
    content: "";
    flex: 1;
    clip-path: polygon(0 0, 100% 0, 100% 100%);
    background: #fc3a51;
    animation:
      l15-1 1s infinite linear alternate,
      l15-2 2s infinite linear -0.5s;
  }

  &::after {
    --s: -1, -1;
    transform: scale(var(--s, 1));
  }

  @keyframes l15-1 {
    0%,
    10% {
      transform: scale(var(--s, 1)) translate(0px) perspective(150px)
        rotateY(0deg);
    }
    33% {
      transform: scale(var(--s, 1)) translate(-10px) perspective(150px)
        rotateX(0deg);
    }
    66% {
      transform: scale(var(--s, 1)) translate(-10px) perspective(150px)
        rotateX(-180deg);
    }
    90%,
    100% {
      transform: scale(var(--s, 1)) translate(0px) perspective(150px)
        rotateX(-180deg);
    }
  }

  @keyframes l15-2 {
    0%,
    49.99% {
      background: #fc3a51;
    }
    50%,
    100% {
      background: #eb9f9f;
    }
  }
`;

export const GlobalLoadingPage = () => {
  return ReactDOM.createPortal(
    <LoaderWrapper>
      <Loader />
    </LoaderWrapper>,
    document.body, // Ensure it's appended to the body element
  );
};
