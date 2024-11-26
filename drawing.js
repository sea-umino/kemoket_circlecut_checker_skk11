const [correctWidth,correctHeight]=[3260,1370];

const errorMessage=document.getElementById('error');
const canvas = document.getElementById('canvas');
//const dpr=window.devicePixelRatio || 1;
canvas.width=correctWidth;
canvas.height=correctHeight;
const ctx = canvas.getContext('2d');
const state=document.getElementById('status');
const imagesize=document.getElementById('imagesize');
const spacenumber=document.getElementById('spacenumber');
const circlecutedge=document.getElementById('circlecutedge');
const colormode=document.getElementById('colormode');
const genre=document.getElementById('genre');
const seiheki=document.getElementById('seiheki');
const version=document.getElementById('version');
const test=document.getElementById('test');
const when=document.getElementById('when');
when.innerText+=" ver.0.0.9\n";
class pixel{
  r;g;b;a;
  constructor(r=0,g=0,b=0,a=0){
    this.r=r;
    this.g=g;
    this.b=b;
    this.a=a;
  }
  strParamater(){
    return `RGBA[${this.r} ${this.g} ${this.b} ${this.a}]`
  };
}


let template=[];
let process=0;
async function getTemps(){
  state.innerText=`状態: 準備中。アップロードはちょっと待ってね...\n`;
  state.innerText+=` ${process}%\n`;

  for(let i=0;i<10;i++){
    const response=await fetch(`template${i+1}.txt`);
    const text=await response.text();
    const ps=text.split("#");
    let cnt=0;
    for(let j=0;j<canvas.height/10;j++){
      let tmp=[];
      while(tmp.length<canvas.width){
        const p=JSON.parse(ps[cnt]);
        cnt++;
        tmp.push(new pixel(p.r, p.g, p.b, p.a));
      }
      template.push(tmp);
    }
    process+=10;
    state.innerText=`状態: 準備中。アップロードはちょっと待ってね... ${process}%\n`;
  }
  state.innerText=`状態: 準備中。読み込みは終わったよ。アップロードはちょっと待ってね...\n`
}

getTemps().then(()=>{
  state.innerText=`状態: 準備完了! サークルカットをアップロードしてね!\n`;
})

document.getElementById('imageInput').addEventListener('change', async event=>{
  errorMessage.textContent='';
  state.innerText=`状態: 解析中。結果が出るまでちょっと待ってね...`
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
        spacenumber.style.color="green";
      }

      //サクカの黒枠チェック
      const {ngList:circlecutEdgeNgList, bimyouList:circlecutEdgeBimyouList}=circlecutEdgeCheck(pixels);
      if(circlecutEdgeNgList.length>0){
        circlecutedge.innerText="サークルカット枠: 侵食の可能性あり\n"
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
        circlecutedge.innerText="サークルカット枠: 侵食の可能性あり\n"
        errorMessage.innerText+=`[CAUTION]サークルカットの黒枠の描画領域に接触している部分に侵食の可能性があります。ただし、使用ドローイングソフトウェアからの出力時に生じた色ブレの可能性もあります\n座標:`;
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
        circlecutedge.style.color="green";
      }

      //カラーモードチェック
      const colorMode=monochromeCheck(pixels);
      if(colorMode=="mono"){
        errorMessage.innerText+=`[ERROR]書き出し時にモノクロ二階調が指定されている可能性があります。サークルカットはRGBまたはグレースケールで出力してください\n`;
        colormode.innerText="カラーモード: モノクロ二階調\n";
        colormode.style.color="red";
      }
      else if(colorMode=="gray"){
        colormode.innerText="カラーモード: グレースケール\n";
        colormode.style.color="green";
      }
      else if(colorMode=="full"){
        colormode.innerText="カラーモード: フルカラー\n"
        colormode.style.color="green";
      }

      //趣向チェック
      const checked=seihekiCheck(pixels);
      if(checked.length==0){
        errorMessage.innerText+=`[ERROR]"メインとする趣向"欄のチェックがありません\n`
        seiheki.innerText=`メインとする趣向: empty\n`;
        seiheki.style.color="red";
      }
      else if(checked.length>1){
        errorMessage.innerText+=`[ERROR]"メインとする趣向"欄に複数のチェックが入っている可能性があります。複数のチェックをしていないか、または他のチェック欄に汚れが無いかを確認してください\n`
        seiheki.innerText=`メインとする趣向: ${checked.join(",")}\n`
        seiheki.style.color="red";
      }
      else{
        seiheki.innerText=`メインとする趣向: ${checked[0]}\n`;
        seiheki.style.color="green";
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
          genre.style.color="green";
        }
      }

      //バージョンチェック
      if(versionCheck(pixels)){
        version.innerText=`テンプレートバージョン: 新春けもケット11\n`;
        version.style.color="green";
      }
      else{
        errorMessage.innerText+=`[ERROR]使用されているテンプレートが新春けもケット11のものではありません。または、右下の開催回番号枠内が汚れていたり、モノクロ二階調で出力されている可能性があります\n`
        version.innerText=`テンプレートバージョン: Unknown\n`
        version.style.color="red";
      }

      state.innerText=`状態: 解析完了!\n`

      test.innerHTML=`
        <b>◯その他のチェック項目</b><br><br>
        ・"配置希望ジャンル"や"メインとする趣向"の欄のチェックは<span style="color:red; font-weight:bold;">塗りつぶし必須</span></b>です。<b>レ点のチェックは不備になります</b><br><br>
        ・<b>サークル名</b>をサークルカットの右側の短冊に記入していますか？<br><br>
        ・<b>サークルカット中</b>に<b>サークル名</b>を記載していますか？　<b>読みやすい文字</b>で記載してありますか？　<span style="color: red; font-weight:bold;">かすれ・薄い・小さい</span>等<span style="color: red; font-weight:bold;">サークル名が読めないと判断された場合は不備になる</span>可能性があります。<br><br>
        ・サークルカットのイラストに<span style="color: red; font-weight:bold;">露骨な性描写表現や残虐性のある暴力表現</span>を含めることはできません。<br><br>
        ・アップロードされたサークルカットのファイル名は<span style="color: red; font-weight:bold;">"${file.name}"</span>です。サークルカットの名前は<span style="color:red; font-weight:bold;">『サークル名.jpg/png/bmp』</span>になっていますか？<br><br>
        ・「<b>ファイル名中のサークル名</b>」「<b>サークルの短冊に記載したサークル名</b>」「<b>申し込みフォームに入力するサークル名</b>」は<span style="color:red; font-weight:bold;">原則完全一致している必要があります</span>。<b>日本語のサークル名をアルファベット表記に変換</b>していたり、<b>ひらがなとカタカナを間違えていたり</b>しませんか？　<b>漢字の字体（新字体or旧字体、異体字等）</b>は一致していますか？　ただし、<span style="color:red; font-weight:bold;">ファイル名に使用できない文字が含まれる場合</span>は、ファイル名に<b>ハイフン（-）</b>や<b>アンダーバー（_）</b>の使用、また<b>その文字の省略</b>が認められます。また、<span style="color:red; font-weight:bold;">機種依存文字はサークル名に使用できません</span>。<br><br>
      `

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
  imagesize.style.color='green';
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
