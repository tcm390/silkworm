import * as THREE from 'three';
// import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// import easing from './easing.js';
import metaversefile from 'metaversefile';
// import {getCaretAtPoint} from 'troika-three-text';
const {useApp, useInternals, useGeometries, useMaterials, getAppByPhysicsId, useFrame, useActivate, useLoaders, usePhysics, useTextInternal, addTrackedApp, useDefaultModules, useCleanup, useSound} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localEuler2 = new THREE.Euler();
const localMatrix = new THREE.Matrix4();

const forward = new THREE.Vector3(0, 0, -1);
const y180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const hitSpeed = 6;

export default e => {
  const app = useApp();
  const {renderer, scene, camera} = useInternals();
  const physics = usePhysics();
  const sounds = useSound();
  // const {CapsuleGeometry} = useGeometries();
  // const {WebaverseShaderMaterial} = useMaterials();
  // const Text = useTextInternal();

  let silkWorm = null;
  const speed = 0.03;
  const angularSpeed = 0.02;
  (async () => {
    let u2 = `${baseUrl}silkworm_v1_fleeky.glb`;
    if (/^https?:/.test(u2)) {
      u2 = '/@proxy/' + u2;
    }
    silkWorm = await metaversefile.createAppAsync({
      start_url: u2,
    });
    silkWorm.quaternion.copy(y180Quaternion);
    silkWorm.frustumCulled = false;
    app.add(silkWorm);
    // window.silkWorm = silkWorm;
  })();

  // this function returns a float representing the playerr look direction of the given vector, as a rotation around the y axis.
  // the value 0 means forward, left is negative, and right is positive.
  const directionToFacingAngle = (() => {
    const localQuaternion = new THREE.Quaternion();
    const localEuler = new THREE.Euler();
    return direction => {
      localQuaternion.setFromUnitVectors(forward, direction);
      localEuler.setFromQuaternion(localQuaternion, 'YXZ');
      return localEuler.y;
    };
  })();

  // this function moves the y-axis angle of the quaternion towards the given direction, by the given amount of radians.
  // the rotation should not overshoot the direction; if it does, it will be clamped to the direction.
  const _angleQuaternionTowards = (quaternion, ry, radians) => {
    localEuler.setFromQuaternion(quaternion, 'YXZ');
    localEuler2.set(0, ry, 0, 'YXZ');

    localEuler.y += Math.PI*2;
    localEuler2.y += Math.PI*2;

    if (localEuler.y < localEuler2.y) {
      localEuler.y += radians;
      if (localEuler.y > localEuler2.y) {
        localEuler.y = localEuler2.y;
      }
    } else if (localEuler.y > localEuler2.y) {
      localEuler.y -= radians;
      if (localEuler.y < localEuler2.y) {
        localEuler.y = localEuler2.y;
      }
    }

    // console.log('update', localEuler.y, directionToFacingAngle(direction), direction.toArray().join(','));

    quaternion.setFromEuler(localEuler);
  };

  let silkWormAction = null;
  const targetPositionAction = () => {
    const range = 10;
    const targetPosition = app.position.clone()
      .add(new THREE.Vector3(Math.random() * 2 - 1, 0, Math.random() * 2 - 1).multiplyScalar(range));
    return {
      // name: 'targetPosition',
      update(timestamp) {
        // console.log('got 1', app.position.toArray().join(','), targetPosition.toArray().join(','));
        if (app.position.distanceTo(targetPosition) >= 1) {
          const direction = targetPosition.clone().sub(app.position).normalize();
          // console.log('got 2', direction.toArray().join(','));
          app.position.add(direction.clone().multiplyScalar(speed));
          // const directionQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Quaternion(), direction);
          _angleQuaternionTowards(app.quaternion, directionToFacingAngle(direction), angularSpeed * 2);
          app.updateMatrixWorld();
          return true;
        } else {
          return false;
        }
      },
    };
  };
  const _angleDiff = (a1, a2) => Math.PI - Math.abs(Math.abs(a1 - a2) - Math.PI);
  const targetQuaternionAction = () => {
    const targetEuler = new THREE.Euler(0, Math.random() * Math.PI*2, 0, 'YXZ');
    // const targetQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);
    return {
      // name: 'targetQuaternion',
      update(timestamp) {
        localEuler.setFromQuaternion(app.quaternion, 'YXZ');
        if (_angleDiff(localEuler.y, targetEuler.y) > 0.1) {
          app.position.add(new THREE.Vector3(0, 0, -speed).applyQuaternion(app.quaternion));
          _angleQuaternionTowards(app.quaternion, targetEuler.y, angularSpeed);

          app.updateMatrixWorld();

          // silkWorm.quaternion.slerp(targetQuaternion, f)
          return true;
        } else {
          return false;
        }
      },
    };
  };
  const alertAction = () => {
    // XXX
  };
  const aggroAction = () => {
    // XXX
  };
  const hitAction = (hitDirection, hitVelocity) => {
    // console.log('hit');
    const enableGravity = true;
    physics.setVelocity(physicsObject, hitVelocity, enableGravity);
    let groundedFrames = 0;
    const maxGroundedFrames = 10;
    return {
      // name: 'targetQuaternion',
      update(timestamp) {
        // getAppByPhysicsId(physicsObject).position.add(physicsObject.velocity.clone().multiplyScalar(hitSpeed));

        // console.log('got app', physicsObject.position.toArray().join(','), physicsObject.collided, physicsObject.grounded);
        const hitQuaternion = localQuaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            localVector.set(0, 0, 0),
            hitDirection,
            localVector2.set(0, 1, 0)
          )
        ).premultiply(y180Quaternion);
        app.position.copy(physicsObject.position);
        app.quaternion.slerp(
          hitQuaternion,
          0.5
        );
        app.updateMatrixWorld();

        groundedFrames += +physicsObject.grounded;

        if (groundedFrames < maxGroundedFrames) {
          return true;
        } else {
          return false;
        }
        /* localEuler.setFromQuaternion(app.quaternion, 'YXZ');
        if (_angleDiff(localEuler.y, targetEuler.y) > 0.1) {
          app.position.add(new THREE.Vector3(0, 0, -speed).applyQuaternion(app.quaternion));
          _angleQuaternionTowards(app.quaternion, targetEuler.y, angularSpeed);

          app.updateMatrixWorld();

          // silkWorm.quaternion.slerp(targetQuaternion, f)
          return true;
        } else {
          return false;
        } */
      },
    };
  };
  const chooseActionOptions = [
    targetPositionAction,
    targetQuaternionAction,
  ];
  const _chooseSilkWormAction = () => {
    const actionOption = chooseActionOptions[Math.floor(Math.random() * chooseActionOptions.length)];
    return actionOption();
  };

  // let running = false;
  let startPlayTime = 0;
  const soundFiles = sounds.getSoundFiles();
  useFrame(({timestamp}) => {
    const timeSeconds = timestamp / 1000;
    if (silkWorm) {
      // running = true;

      for (;;) {
        // console.log('tick');

        if (!silkWormAction) {
          silkWormAction = _chooseSilkWormAction();
        }
        if (silkWormAction.update(timestamp)) {
          break;
        } else {
          silkWormAction = null;
        }
      }

      // running = false;
    }

    for (const physicsObject of physicsIds) {
      physicsObject.position.copy(app.position);
      physicsObject.quaternion.copy(app.quaternion);
      physicsObject.updateMatrixWorld();
      physics.setTransform(physicsObject);
    }
    if(timeSeconds - startPlayTime > soundFiles.silkWorms[7].duration || startPlayTime === 0 ){
      sounds.playSound(soundFiles.silkWorms[7], app);
      startPlayTime = timeSeconds;
    }
  });

  /* let activateCb = null;
  let frameCb = null;
  useActivate(() => {
    activateCb && activateCb();
  }); */
  useFrame(({timestamp, timeDiff}) => {
    // frameCb && frameCb();
    // material.uniforms.time.value = (performance.now() / 1000) % 1;
  });

  app.addEventListener('hit', e => {
    // console.log('silk worm hit', e);

    const {hitDirection} = e;
    const hitDirectionXZ = hitDirection.clone();
    hitDirectionXZ.y = 0;
    hitDirectionXZ.normalize();

    const hitVelocity = hitDirectionXZ.clone();
    hitVelocity.y = 0.5 + Math.random();
    hitVelocity.normalize().multiplyScalar(hitSpeed);

    silkWormAction = hitAction(hitDirectionXZ, hitVelocity);
  });

  const physicsIds = [];

  const physicsMaterial = [0.5, 0.5, 1];
  const materialAddress = physics.createMaterial(physicsMaterial);
  const physicsObject = physics.addCapsuleGeometry(app.position, app.quaternion, 0.3, 0, materialAddress, true);
  physicsObject.detached = true;
  physicsIds.push(physicsObject);
  
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physics.destroyMaterial(materialAddress);
  });

  return app;
};