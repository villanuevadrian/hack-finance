import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import type { Avatar } from '../character'

/** The player's figure, used both in the character preview and in the 3D world. Purely cosmetic. */
export function AvatarModel({ avatar }: { avatar: Avatar }) {
  const { suit, visor, accessory } = avatar
  const gear = avatar.gear ?? []
  return (
    <group>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.56, 20]} />
        <meshStandardMaterial color={suit} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.88, 0]} castShadow>
        <sphereGeometry args={[0.21, 24, 18]} />
        <meshStandardMaterial color={suit} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.9, 0.17]}>
        <boxGeometry args={[0.26, 0.08, 0.06]} />
        <meshStandardMaterial color={visor} emissive={visor} emissiveIntensity={2.5} />
      </mesh>
      {gear.includes('cape') && (
        <mesh position={[0, 0.5, -0.2]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[0.42, 0.62, 0.03]} />
          <meshStandardMaterial color="#c0263f" roughness={0.7} />
        </mesh>
      )}
      {gear.includes('pauldrons') && (
        <group>
          <mesh position={[0.22, 0.64, 0]}><sphereGeometry args={[0.09, 14, 10]} /><meshStandardMaterial color="#ffc94a" metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[-0.22, 0.64, 0]}><sphereGeometry args={[0.09, 14, 10]} /><meshStandardMaterial color="#ffc94a" metalness={0.6} roughness={0.3} /></mesh>
        </group>
      )}
      {gear.includes('shield') && (
        <mesh position={[-0.27, 0.4, 0.05]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.04, 20]} />
          <meshStandardMaterial color="#4cc3ff" emissive="#4cc3ff" emissiveIntensity={0.25} metalness={0.4} />
        </mesh>
      )}
      {gear.includes('boots') && (
        <group>
          <mesh position={[0.09, 0.05, 0.03]}><boxGeometry args={[0.12, 0.1, 0.2]} /><meshStandardMaterial color="#3b2a1a" /></mesh>
          <mesh position={[-0.09, 0.05, 0.03]}><boxGeometry args={[0.12, 0.1, 0.2]} /><meshStandardMaterial color="#3b2a1a" /></mesh>
        </group>
      )}
      {gear.includes('banner') && (
        <group position={[0.3, 0, -0.1]}>
          <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.015, 0.015, 1.2, 8]} /><meshStandardMaterial color="#f4f1ff" /></mesh>
          <mesh position={[0.11, 1.05, 0]}><boxGeometry args={[0.2, 0.14, 0.01]} /><meshStandardMaterial color="#3ddc97" emissive="#3ddc97" emissiveIntensity={0.4} /></mesh>
        </group>
      )}
      {accessory === 'cap' && (
        <group position={[0, 1.04, 0]}>
          <mesh><cylinderGeometry args={[0.2, 0.21, 0.1, 20]} /><meshStandardMaterial color={visor} /></mesh>
          <mesh position={[0, -0.03, 0.18]}><boxGeometry args={[0.26, 0.03, 0.18]} /><meshStandardMaterial color={visor} /></mesh>
        </group>
      )}
      {accessory === 'headphones' && (
        <group position={[0, 0.9, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.24, 0.025, 8, 24, Math.PI]} /><meshStandardMaterial color="#2a2550" /></mesh>
          <mesh position={[0.23, -0.02, 0]}><cylinderGeometry args={[0.07, 0.07, 0.06, 16]} /><meshStandardMaterial color={visor} emissive={visor} emissiveIntensity={0.6} /></mesh>
          <mesh position={[-0.23, -0.02, 0]}><cylinderGeometry args={[0.07, 0.07, 0.06, 16]} /><meshStandardMaterial color={visor} emissive={visor} emissiveIntensity={0.6} /></mesh>
        </group>
      )}
      {accessory === 'backpack' && (
        <mesh position={[0, 0.45, -0.22]} castShadow>
          <boxGeometry args={[0.3, 0.36, 0.14]} />
          <meshStandardMaterial color={visor} roughness={0.6} />
        </mesh>
      )}
    </group>
  )
}

function Turntable({ avatar, reducedMotion }: { avatar: Avatar; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y += dt * 0.6
  })
  return (
    <group ref={ref} position={[0, -0.6, 0]} rotation={[0, 0.5, 0]}>
      <AvatarModel avatar={avatar} />
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.08, 32]} />
        <meshStandardMaterial color="#262056" />
      </mesh>
    </group>
  )
}

/** The character's portrait: the figure turning on a pedestal. */
export function AvatarPreview({ avatar, reducedMotion }: { avatar: Avatar; reducedMotion: boolean }) {
  return (
    <div className="avatar-preview" aria-hidden="true">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.4, 2.6], fov: 35 }} shadows>
        <ambientLight intensity={0.9} color="#b9b0ff" />
        <directionalLight position={[2, 3, 3]} intensity={2.4} castShadow />
        <pointLight position={[-1.5, 1, 1.5]} intensity={8} distance={5} color={avatar.visor} />
        <Turntable avatar={avatar} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  )
}
