import * as THREE from 'three';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.querySelector('#three-stage');
const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, .1, 100);
camera.position.z = 6;

const geometry = new THREE.BufferGeometry();
const count = innerWidth < 700 ? 420 : 950;
const positions = new Float32Array(count * 3);
for(let i=0;i<count*3;i+=3){positions[i]=(Math.random()-.5)*12;positions[i+1]=(Math.random()-.5)*8;positions[i+2]=(Math.random()-.5)*7}
geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
const material = new THREE.PointsMaterial({color:0xf1c75b,size:.018,transparent:true,opacity:.44,blending:THREE.AdditiveBlending});
const particles = new THREE.Points(geometry,material);
scene.add(particles);

const ring = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.35,.018,180,12,2,5),
  new THREE.MeshBasicMaterial({color:0xf1c75b,transparent:true,opacity:.14})
);
ring.position.set(2.8,.2,-1.5);
ring.rotation.x=.8;
scene.add(ring);

let px=0,py=0,scrollProgress=0;
addEventListener('pointermove',e=>{px=(e.clientX/innerWidth-.5)*.18;py=(e.clientY/innerHeight-.5)*.12},{passive:true});
addEventListener('scroll',()=>{scrollProgress=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)},{passive:true});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)}
addEventListener('resize',resize);resize();
function tick(t){particles.rotation.y += (px+scrollProgress*.7-particles.rotation.y)*.025;particles.rotation.x += (-py-particles.rotation.x)*.025;if(!reduced){particles.rotation.z=t*.000018;ring.rotation.y=t*.00011;ring.rotation.z=-t*.00007}ring.position.y=.2-scrollProgress*2.4;renderer.render(scene,camera);requestAnimationFrame(tick)}
requestAnimationFrame(tick);

const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.18});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
