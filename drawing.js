const [correctWidth,correctHeight]=[3260,1370];

const errorMessage=document.getElementById('error');
const canvas = document.getElementById('canvas');
//const dpr=window.devicePixelRatio || 1;
canvas.width=correctWidth;
canvas.height=correctHeight;
const ctx = canvas.getContext('2d');
const imagesize=document.getElementById('imagesize');
const spacenumber=document.getElementById('spacenumber');
const circlecutedge=document.getElementById('circlecutedge');
const colormode=document.getElementById('colormode');
const genre=document.getElementById('genre');
const seiheki=document.getElementById('seiheki');
const version=document.getElementById('version');
let template=Array(canvas.height).fill().map(_=>Array(canvas.width).fill().map(_=>undefined));
fetch("./template.txt")
  .then(response=>{
    if(!response.ok){
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text;
  })
  .then(text=>{
    text.split("#").map((jsonp, index)=>{
      const p=JSON.parse(jsonp);
      template[Math.floor(index/canvas.width)][index%canvas.width]=new pixel(p.r,p.g,p.b,p.a);
    })
  }).catch(err=>{
    console.error(`Error:`,err);
  })

document.getElementById('imageInput').addEventListener('change', async event=>{
  errorMessage.textContent='';
  const file = event.target.files[0];
  if(!file) return;
  //pngかどうか確認
  /*
  if(!file.type.includes("png")){
    errorMessage.textContent="[ERROR] アップロードされた画像がPNGではありません";
    return;
  }
    */
  const reader = new FileReader()
  //FileReaderで読んだときに発火
  reader.onload=()=>{
    //画像クラス
    const image = new Image();
    //画像が読み込まれた発火
    image.onload=()=>{
      //画像サイズに関するチェック
      if(!imageSizeCheck(image)) return; //ここで不備があったらこの後の処理を全て飛ばして終了

      //最初にcanvasをリセット
      ctx.clearRect(0,0,canvas.width, canvas.height);
      //そしてcanvasに描画（表示はcss制御で縮小）
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
      const _pixels = imageData.data;
      //_pixelsは一つのピクセルに対してr,g,b,aの4要素を並べた配列なので、これをまとめて一つのオブジェクトとしたh x wの配列に修正する
      const pixels=Array(canvas.height).fill().map(_=>Array(canvas.width).fill().map(_=>null));
      for(let i=0;i<canvas.width*canvas.height*4;i+=4){
        const [h,w]=[Math.floor((i/4)/canvas.width), (i/4)%canvas.width];
        pixels[h][w]=new pixel(_pixels[i],_pixels[i+1],_pixels[i+2],_pixels[i+3]);
      }

      //不透明度が低いピクセルが存在しないかチェック
      const clear=clearPixelCheck(pixels);
      if(clear.length>0){
        errorMessage.innerText+=`[ERROR]不透明度の低いピクセルが存在します。テンプレートpngの非表示や一部透過が行われていないか確認してください\n座標:`;
        for(let i=0;i<Math.min(10, clear.length);i++){
          errorMessage.innerText+=`[${clear[i][1]}, ${clear[i][0]}]`;
        }
        if(clear.length>10){
          errorMessage.innerText+="...";
        }
        errorMessage.innerText+="\n";
      }

      //スペースナンバー枠が汚れていないか
      const spaceNumberNgList=spaceNumberCheck(pixels);
      if(spaceNumberNgList.length>0){
        errorMessage.innerText+=`[ERROR] スペースナンバーが入る枠に書き込みがあります\n座標:`
        for(let i=0;i<Math.min(10, spaceNumberNgList.length);i++){
          errorMessage.innerText+=`[${spaceNumberNgList[i][1]}, ${spaceNumberNgList[i][0]}]`;
        }
        if(spaceNumberNgList.length>10){
          errorMessage.innerText+="...";
        }
        errorMessage.innerText+="\n";
        spacenumber.innerText="スペースナンバー枠: 汚れあり\n";
        spacenumber.style.color="red";
      }
      else{
        spacenumber.innerText="スペースナンバー枠: OK\n";
        spacenumber.style.color="black";
      }

      //サクカの黒枠チェック
      const {ngList:circlecutEdgeNgList, bimyouList:circlecutEdgeBimyouList}=circlecutEdgeCheck(pixels);
      if(circlecutEdgeNgList.length>0){
        circlecutedge.innerText="サークルカット枠: 侵食の可能性あり"
        circlecutedge.style.color="red";
        errorMessage.innerText+=`[ERROR] サークルカットの黒枠上までイラストが侵食している可能性があります\n座標:`
        for(let i=0;i<Math.min(10, circlecutEdgeNgList.length);i++){
          errorMessage.innerText+=`[${circlecutEdgeNgList[i][1]}, ${circlecutEdgeNgList[i][1]}]`;
        }
        if(circlecutEdgeNgList.lenth>10){
          errorMessage.innerText+="...";
        }
        errorMessage.innerText+="\n";
      }
      else if(circlecutEdgeBimyouList.length>0){
        circlecutedge.style.color="orange";
        circlecutedge.innerText="サークルカット枠: 侵食の可能性あり"
        errorMessage.innerText+=`[CAUTION]サークルカットの黒枠の描画領域に摂食している部分に侵食の可能性があります。ただし、使用ドローイングソフトウェアからの出力時に生じた色ブレの可能性もあります\n座標:`;
        for(let i=0;i<Math.min(10, circlecutEdgeBimyouList.length);i++){
          errorMessage.innerText+=`[${circlecutEdgeBimyouList[i][1]}, ${circlecutEdgeBimyouList[i][0]}]`;
        }
        if(circlecutEdgeBimyouList.length>10){
          errorMessage.innerText+="...";
        }
        errorMessage.innerText+="\n";
      }
      else{
        circlecutedge.innerText="サークルカット枠: OK\n";
        circlecutedge.style.color="black";
      }

      //カラーモードチェック
      const colorMode=monochromeCheck(pixels);
      if(colorMode=="mono"){
        errorMessage.innerText+=`[ERROR]書き出し時にモノクロ二階調が指定されている可能性があります。サークルカットはRGBまたはグレースケールで出力してください\n`;
        colormode.innerText="カラーモード: モノクロ二階調";
        colormode.style.color="red";
      }
      else if(colorMode=="gray"){
        colormode.innerText="カラーモード: グレースケール";
        colormode.style.color="black";
      }
      else if(colorMode=="full"){
        colormode.innerText="カラーモード: フルカラー"
        colormode.style.color="black";
      }

      //趣向チェック
      const checked=seihekiCheck(pixels);
      if(checked.length==0){
        errorMessage.innerText+=`[ERROR]"メインとする趣向"欄のチェックがありません\n`
        seiheki.innerText=`メインとする趣向: empty`;
        seiheki.style.color="red";
      }
      else if(checked.length>1){
        errorMessage.innerText+=`[ERROR]"メインとする趣向"欄に複数のチェックが入っている可能性があります。複数のチェックをしていないか、または他のチェック欄に汚れが無いかを確認してください\n`
        seiheki.innerText=`メインとする趣向: ${checked.join(",")}\n`
        seiheki.style.color="red";
      }
      else{
        seiheki.innerText=`メインとする趣向: ${checked[0]}\n`;
        seiheki.style.color="black";
      }

      //配置希望ジャンル
      const {checked:genreChecked, sub:sub}=genreCheck(pixels);
      if(genreChecked.length==0){
        errorMessage.innerText+=`[ERROR]"配置希望ジャンル欄のチェックがありません\n"`
        genre.innerText=`配置希望ジャンル: empty\n`;
        genre.style.color="red";
      }
      else if(genreChecked.length>1){
        errorMessage.innerText+=`[ERROR]"配置希望ジャンル"欄に複数のチェックが入っている可能性があります。複数のチェックをしていないか、または他のチェック欄に汚れが無いかを確認してください\n`
        genre.innerText=`配置希望ジャンル: ${genreChecked.join(",")}\n`;
        genre.style.color="red";
      }
      else{
        if(genreChecked[0]=="その他版権" && !sub){
          errorMessage.innerText+=`[ERROR]"配置希望ジャンル"欄で"その他版権"を選択していますが、詳細が記載されていません\n`
          genre.innerText=`配置希望ジャンル: その他版権\n`
          genre.style.color="red";
        }
        else if(genreChecked[0]=="上記に該当しないジャンル" && !sub){
          errorMessage.innerText+=`[ERROR]"配置希望ジャンル"欄で"上記に該当しないジャンル"を選択していますが、詳細が記載されていません\n`
          genre.innerText=`配置希望ジャンル: 上記に該当しないジャンル\n`
          genre.style.color="red";
        }
        else{
          genre.innerText=`配置希望ジャンル: ${genreChecked[0]}\n`;
          genre.style.color="black";
        }
      }

      //バージョンチェック
      if(versionCheck(pixels)){
        version.innerText=`テンプレートバージョン: 新春けもケット11\n`;
        version.style.color="black";
      }
      else{
        errorMessage.innerText+=`[ERROR]使用されているテンプレートが新春けもケット11のものではありません。または、右下の開催回番号枠内が汚れている可能性があります\n`
        version.innerText=`テンプレートバージョン: Unknown\n`
        version.style.color="red";
      }

      /*
      ////以下、デバッグ用////
      const test = document.getElementById('test');
      const anal = {};
      for(let h=0;h<canvas.height;h++){
        for(let w=0;w<canvas.width;w++){
          const pstr=JSON.stringify(pixels[h][w]);
          if(pstr in anal){
            anal[pstr]++;
          }
          else{
            anal[pstr]=1;
          }
        }
      }
      const debug=(x,y)=>{
        test.innerText+=`x=${x} y=${y} ${pixels[y][x].strParamater()}\n`
      }
        */
      
    }
    //URLを介してimageオブジェクトにアップロードした画像を渡す
    image.src=reader.result;
  }
  //アップロードされたファイルを読み取りURLをreader.resultに格納
  reader.readAsDataURL(file);
})

function imageSizeCheck(image){
  imagesize.style.color='black';
  imagesize.innerText=`画像サイズ: ${image.width}px × ${image.height}px\n`;
  if(image.width!=correctWidth || image.height!=correctHeight){
    errorMessage.textContent=`[ERROR] アップロードされた画像のサイズが間違っています。正しいサイズは ${correctWidth}px × ${correctHeight}px です`;
    imagesize.style.color='red';
    return false;
  }
  else {
    return true;
  }
}

class pixel{
  r;g;b;a;
  constructor(r,g,b,a){
    this.r=r;
    this.g=g;
    this.b=b;
    this.a=a;
  }

  strParamater(){
    return `RGBA[${this.r} ${this.g} ${this.b} ${this.a}]`
  };
}

function spaceNumberCheck(pixels){
  const ngList=[];
  const c=new pixel(255,255,255,255);
  const check=c.strParamater()
  for(let h=16;h<=251;h++){
    for(let w=16;w<=251;w++){
      if(pixels[h][w].strParamater()!=check){
        ngList.push([h,w]);
      }
    }
  }
  return ngList;
}

function circlecutEdgeCheck(pixels){
  const ngList=[];
  const bimyouList=[];
  const c=pixels[0][0];
  const check=c.strParamater();
  const edge=(h,w)=>{
    if(pixels[h][w].strParamater()!=check){
      ngList.push([h,w]);
    }
  }
  const div=(h,w)=>{
    if(pixels[h][w].r>=20 || pixels[h][w].g>=20 || pixels[h][w].b>=20){
      bimyouList.push([h,w]);
    }
  }
  for(let h=0;h<=1369;h++){
    for(let w=0;w<=14;w++){
      edge(h,w);
    }
    for(let w=882;w<=896;w++){
      edge(h,w);
    }
    for(let h=0;h<=14;h++){
      for(let w=15;w<=895;w++){
        edge(h,w);
      }
    }    
  }
  for(let h=253;h<=256;h++){
    for(let w=15;w<=266;w++){
      edge(h,w);
    }
  }
  for(let h=1355;h<=1369;h++){
    for(let w=15;w<=895;w++){
      edge(h,w);
    }
  }
  for(let h=15;h<=252;h++){
    for(let w=253;w<=256;w++){
      edge(h,w);
    }
  }
  for(let h=15;h<=252;h++){
    div(h,15);
    div(h,252);
  }
  for(let w=15;w<=252;w++){
    div(15,w);
    div(252,w);
  }  
  for(let h=15;h<=267;h++){
    div(h,267);
  }
  for(let w=15;w<=267;w++){
    div(267,w);
  }
  for(let w=267;w<=881;w++){
    div(15,w);
  }
  for(let h=15;h<=1354;h++){
    div(h,881);
  }
  for(let w=15;w<=881;w++){
    div(1354, w);
  }
  for(let h=267;h<=1354;h++){
    div(h,15);
  }
  for(let h=0;h<=1369;h++){
    div(h,897);
  }

  return {ngList:ngList, bimyouList:bimyouList};
}

function monochromeCheck(pixels){
  let mode="";
  const black= new pixel(0,0,0,255);
  if(pixels[8][909].strParamater()==black.strParamater()){
    mode="mono";
  }
  else{
    const redPixel=pixels[296][2280];
    if(redPixel.r>redPixel.g+150 && redPixel.r>redPixel.b+150){
      mode="full";
    }
    else{
      mode="gray";
    }
  }
  return mode;
}

function seihekiCheck(pixels){
  const checked=[];
  const _white=new pixel(255,255,255,255);
  const white=_white.strParamater();

  let [all,male,female,shota,lori,futa]=[false,false,false,false,false,false];
  for(let h=464;h<=495;h++){
    for(let w=971;w<=1002;w++){
      if(pixels[h][w].strParamater()!=white){
        all=true;
      }
    }
  }
  if(all)checked.push("全年齢向けメイン");

  for(let h=464;h<=495;h++){
    for(let w=1627;w<=1658;w++){
      if(pixels[h][w].strParamater()!=white){
        male=true;
      }
    }
  }
  if(male)checked.push("オス");
  
  for(let h=464;h<=495;h++){
    for(let w=1877;w<=1908;w++){
      if(pixels[h][w].strParamater()!=white){
        female=true;
      }
    }
  }
  if(female)checked.push("メス");

  for(let h=464;h<=495;h++){
    for(let w=2119;w<=2150;w++){
      if(pixels[h][w].strParamater()!=white){
        shota=true;
      }
    }
  }
  if(shota)checked.push("ショタ");

  for(let h=464;h<=495;h++){
    for(let w=2395;w<=2427;w++){
      if(pixels[h][w].strParamater()!=white){
        lori=true;
      }
    }
  }
  if(lori)checked.push("ロリ");

  for(let h=464;h<=495;h++){
    for(let w=2618;w<=2650;w++){
      if(pixels[h][w].strParamater()!=white){
        futa=true;
      }
    }
  }
  if(futa)checked.push("フタナリ");

  return checked;
}

function genreCheck(pixels){
  const checked=[];
  let sub=false;
  const _white=new pixel(255,255,255,255);
  const white=_white.strParamater();
  let [animaloid,dragon,tetra, bird,pokemon, life, auth, stelse]=[false,false,false,false,false,false,false,false];
  for(let h=632;h<=664;h++){
    for(let w=971;w<=1003;w++){
      if(pixels[h][w].strParamater()!=white){
        animaloid=true;
      }
    }
  }
  if(animaloid){
    checked.push("獣人");
  }

  for(let h=632;h<=663;h++){
    for(let w=1232;w<=1265;w++){
      if(pixels[h][w].strParamater()!=white){
        dragon=true;
      }
    }
  }
  if(dragon){
    checked.push("ドラゴン・爬虫類");
  }
  
  for(let h=632;h<=664;h++){
    for(let w=1792;w<=1824;w++){
      if(pixels[h][w].strParamater()!=white){
        tetra=true;
      }
    }
  }
  if(tetra){
    checked.push("四足");
  }

  for(let h=632;h<=664;h++){
    for(let w=2055;w<=2086;w++){
      if(pixels[h][w].strParamater()!=white){
        bird=true;
      }
    }
  }
  if(bird){
    checked.push("鳥類");
  }

  for(let h=632;h<=664;h++){
    for(let w=2317;w<=2349;w++){
      if(pixels[h][w].strParamater()!=white){
        pokemon=true;
      }
    }
  }
  if(pokemon){
    checked.push("ポケモン");
  }

  for(let h=632;h<=664;h++){
    for(let w=2670;w<=2702;w++){
      if(pixels[h][w].strParamater()!=white){
        life=true;
      }
    }
  }
  if(life){
    checked.push("ライフワンダーズ");
  }

  for(let h=715;h<=747;h++){
    for(let w=971;w<=1002;w++){
      if(pixels[h][w].strParamater()!=white){
        auth=true;
      }
    }
  }
  if(auth){
    checked.push("その他版権");
    let cnt=0;
    for(let h=700;h<=753;h++){
      for(let w=1309;w<=2798;w++){
        if(pixels[h][w].strParamater()!=white){
          cnt++;
        }
      }
    }
    if(cnt>=100){
      sub=true;
    }
  }

  for(let h=798;h<=830;h++){
    for(let w=971;w<=1002;w++){
      if(pixels[h][w].strParamater()!=white){
        stelse=true;
      }
    }
  }
  if(stelse){
    checked.push("上記に該当しないジャンル");
    let cnt=0;
    for(let h=777;h<=836;h++){
      for(let w=1648;w<=3129;w++){
        if(pixels[h][w].strParamater()!=white){
          cnt++;
        }
      }
    }
    if(cnt>=100){
      sub=true;
    }
  }

  return {checked:checked, sub:sub};
}

function clearPixelCheck(pixels){
  const clear=[]
  for(let h=0;h<canvas.height;h++){
    for(let w=0;w<canvas.width;w++){
      if(pixels[h][w].a<255){
        clear.push([h,w]);
      }
    }
  }
  return clear;
}

function versionCheck(pixels){
  let cnt=0;
  const _white=new pixel(255,255,255,255);
  const white=_white.strParamater();
  for(let h=1288;h<=1354;h++){
    for(let w=3023;w<=3245;w++){
      if((pixels[h][w].strParamater()==white) ^ (template[h][w].strParamater()==white)){
        cnt++;
      }
    }
  }
  return cnt<=20;
}