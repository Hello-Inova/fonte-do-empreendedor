const smartLogoCache=new Map();

function logoBackground(data,width,box){
  const points=[[box.x,box.y],[box.x+box.width-1,box.y],[box.x,box.y+box.height-1],[box.x+box.width-1,box.y+box.height-1]];
  const total=[0,0,0,0];
  points.forEach(([x,y])=>{const index=(y*width+x)*4;for(let channel=0;channel<4;channel++)total[channel]+=data[index+channel]});
  return total.map(value=>value/points.length);
}

function findLogoBounds(data,width,height,box){
  const background=logoBackground(data,width,box);let left=box.x+box.width;let top=box.y+box.height;let right=box.x-1;let bottom=box.y-1;
  const xEnd=box.x+box.width;const yEnd=box.y+box.height;
  for(let y=box.y;y<yEnd;y+=1){
    for(let x=box.x;x<xEnd;x+=1){
      const index=(y*width+x)*4;const alpha=data[index+3];
      const difference=Math.max(Math.abs(data[index]-background[0]),Math.abs(data[index+1]-background[1]),Math.abs(data[index+2]-background[2]),Math.abs(alpha-background[3]));
      if(difference>30&&alpha>12){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
    }
  }
  if(right<left||bottom<top)return box;
  const found={x:left,y:top,width:right-left+1,height:bottom-top+1};
  return found.width*found.height<box.width*box.height*.985?found:box;
}

async function normalizePartnerLogo(source){
  const sourceKey=typeof source==='string'?source:null;if(sourceKey&&smartLogoCache.has(sourceKey))return smartLogoCache.get(sourceKey);
  const blob=typeof source==='string'?await fetch(source).then(response=>response.blob()):source;
  const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});
  const workScale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));const workWidth=Math.max(1,Math.round(bitmap.width*workScale));const workHeight=Math.max(1,Math.round(bitmap.height*workScale));
  const work=document.createElement('canvas');work.width=workWidth;work.height=workHeight;const workContext=work.getContext('2d',{willReadFrequently:true});workContext.drawImage(bitmap,0,0,workWidth,workHeight);
  const pixels=workContext.getImageData(0,0,workWidth,workHeight).data;let bounds={x:0,y:0,width:workWidth,height:workHeight};
  for(let pass=0;pass<2;pass+=1)bounds=findLogoBounds(pixels,workWidth,workHeight,bounds);
  const margin=Math.max(2,Math.round(Math.max(bounds.width,bounds.height)*.06));bounds={x:Math.max(0,bounds.x-margin),y:Math.max(0,bounds.y-margin),width:Math.min(workWidth,bounds.x+bounds.width+margin)-Math.max(0,bounds.x-margin),height:Math.min(workHeight,bounds.y+bounds.height+margin)-Math.max(0,bounds.y-margin)};
  const sourceBounds={x:bounds.x/workScale,y:bounds.y/workScale,width:bounds.width/workScale,height:bounds.height/workScale};let result;
  for(const size of [600,480,360]){
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const context=canvas.getContext('2d');const padding=Math.round(size*.06);const scale=Math.min((size-padding*2)/sourceBounds.width,(size-padding*2)/sourceBounds.height);const width=Math.round(sourceBounds.width*scale);const height=Math.round(sourceBounds.height*scale);
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(bitmap,sourceBounds.x,sourceBounds.y,sourceBounds.width,sourceBounds.height,(size-width)/2,(size-height)/2,width,height);
    result=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));if(result.size<=500*1024)break;
  }
  bitmap.close();const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(result)});if(sourceKey)smartLogoCache.set(sourceKey,dataUrl);return dataUrl;
}

async function adaptPartnerLogos(root=document){
  const images=[...root.querySelectorAll('.public-partner-logo img,.portal-partner-logo img,.logo-preview img')].filter(image=>!image.dataset.smartLogo);
  await Promise.all(images.map(async image=>{image.dataset.smartLogo='processing';try{image.src=await normalizePartnerLogo(image.currentSrc||image.src);image.dataset.smartLogo='ready'}catch{image.dataset.smartLogo='original'}}));
}

window.normalizePartnerLogo=normalizePartnerLogo;
window.adaptPartnerLogos=adaptPartnerLogos;
