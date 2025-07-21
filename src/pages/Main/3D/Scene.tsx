import * as THREE from 'three';
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const Scene: React.FC = () => {
  const sceneDOM = useRef<HTMLDivElement>(null);
  return (
    <div ref={sceneDOM} style={{ width: '100%', height: '100%' }} className="3D-scene">
      <Canvas
        gl={(canvas) => {
          const gl = new THREE.WebGL({ canvas, antialias: true });
          gl.setClearColor('#e4e3e3', 1);
          return gl;
        }}
      >
        <ambientLight color={0xffffff} intensity={1} />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial />
        </mesh>
        <gridHelper args={[10, 10, '#292828', '#292929']} />
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default Scene;
