import './vendor/pdf-lib.min.js';
import { pageRange } from './mini-model.js?v=1';
self.onmessage=async event=>{
    const {id,mode,files,pages}=event.data;
    try {
        const PDF=globalThis.PDFLib.PDFDocument,output=await PDF.create();
        for(let index=0;index<files.length;index++){
            const file=files[index];
            if(mode==='images') {
                const bitmap=await createImageBitmap(file),scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
                const canvas=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale)));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
                const blob=await canvas.convertToBlob({type:'image/jpeg',quality:.9}),image=await output.embedJpg(await blob.arrayBuffer());
                const page=output.addPage([595.28,841.89]),ratio=Math.min(555.28/image.width,801.89/image.height);page.drawImage(image,{x:(595.28-image.width*ratio)/2,y:(841.89-image.height*ratio)/2,width:image.width*ratio,height:image.height*ratio});
            } else {
                const source=await PDF.load(await file.arrayBuffer());
                if(mode==='extract'&&index>0)break;
                const indices=mode==='extract'?pageRange(pages,source.getPageCount()):source.getPageIndices();
                const copied=await output.copyPages(source,indices);copied.forEach(page=>output.addPage(page));
            }
        }
        const bytes=await output.save();self.postMessage({id,buffer:bytes.buffer,count:output.getPageCount()},[bytes.buffer]);
    }catch(error){self.postMessage({id,error: /encrypt/i.test(error.message)?'暗号化されたPDFには対応していません。':error.message});}
};
