const [correctWidth,correctHeight]=[3260,1370];

const errorMessage=document.getElementById('error');
const canvas = document.getElementById('canvas');
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
when.innerText+=" ver.0.0.15\n";
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

state.innerText=`状態: 準備完了! サークルカットをアップロードしてね!\n`;


document.getElementById('imageInput').addEventListener('change', async event=>{
  errorMessage.textContent='';
  errorMessage.style.color="red";
  state.innerText=`状態: 解析中。結果が出るまでちょっと待ってね...`
  const file = event.target.files[0];
  if(!file) return;

  //pngかどうか確認
  if(!file.type.includes("png")){
    errorMessage.innerText+="[CAUTION] アップロードされた画像がPNGではありません。このツールはPNGのみに対応しており、JPG/BMPは解析は行われますが高確率でエラーとなります。\n";
  }

  const reader = new FileReader()
  //FileReaderで読んだときに発火
  reader.onload=()=>{
    //画像クラス
    const image = new Image();
    //画像が読み込まれた発火
    image.onload= async ()=>{
      let errored=false;
      //画像サイズに関するチェック
      if(!imageSizeCheck(image)) return; //ここで不備があったらこの後の処理を全て飛ばして終了

      //エラー原因のピクセルをメモ
      const errorPixels=[];

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
        errored=true;
        clear.map(pixel=>{
          errorPixels.push([pixel[1], pixel[0]]);
        })
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
        errored=true;
        spaceNumberNgList.map(pixel=>{
          errorPixels.push([pixel[1], pixel[0]]);
        });
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
          errorMessage.innerText+=`[${circlecutEdgeNgList[i][1]}, ${circlecutEdgeNgList[i][0]}]`;
        }
        if(circlecutEdgeNgList.length>10){
          errorMessage.innerText+="...";
        }
        errorMessage.innerText+="\n";
        errored=true;
        circlecutEdgeNgList.map(pixel=>{
          errorPixels.push([pixel[1], pixel[0]]);
        })
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
        errored=true;
        circlecutEdgeBimyouList.map(pixel=>{
          errorPixels.push([pixel[1], pixel[0]]);
        })
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
        errored=true;
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
      const {all, male, female, shota, loli, futa}=seihekiCheck(pixels);
      const [seihekiChecked, seihekiHami,seihekiDis]=[[],[],[]];
      [all, male, female, shota, loli, futa].map(seiheki=>{
        if(seiheki.checked){
          seihekiChecked.push(seiheki.text);
          if(seiheki.dis>0){
            seihekiDis.push(seiheki.text);
          }
        }
        if(seiheki.hami){
          seihekiHami.push(seiheki.text);
        }
      })
      if(seihekiChecked.length==0){
        errorMessage.innerText+=`[ERROR]"メインとする趣向"欄のチェックがありません\n`
        seiheki.innerText=`メインとする趣向: empty\n`;
        seiheki.style.color="red";
        errored=true;
      }
      else if(seihekiChecked.length>1){
        errorMessage.innerText+=`[ERROR]"メインとする趣向"欄に複数のチェックが入っている可能性があります。複数のチェックをしていないか、または他のチェック欄に汚れが無いかを確認してください\n`
        seiheki.innerText=`メインとする趣向: ${seihekiChecked.join(",")}\n`
        seiheki.style.color="red";
        errored=true;
      }
      else{
        seiheki.innerText=`メインとする趣向: ${seihekiChecked[0]}\n`;
        seiheki.style.color="green";
        if(seihekiDis.length>0){
          errorMessage.innerText+=`[ERROR]"メインとする趣向"欄の以下のチェックボックス内の塗りつぶしが不足している可能性があります\n項目:${seihekiDis.join(",")}\n`;
          errored=true;
        }
      }
      if(seihekiHami.length>0){
        errorMessage.innerText+=`[ERROR]"メインとする趣向"欄の以下のチェックボックスの周囲に書き込みが認められます。汚れていたり、またはレ点でチェックしていないか確認してください\n項目: ${seihekiHami.join(",")}\n`;
        errored=true;
      }

      //配置希望ジャンル
      const {animaloid,dragon,tetra,bird,pokemon,life,auth,stelse,sub}=genreCheck(pixels);
      const [genreChecked,genreHami,genreDis]=[[],[],[]];
      [animaloid, dragon, tetra, bird, pokemon, life, auth, stelse].map(genre=>{
        if(genre.checked){
          genreChecked.push(genre.text);
          if(genre.dis>0){
            genreDis.push(genre.text);
          }
        }
        if(genre.hami){
          genreHami.push(genre.text);
        }
      })
      if(genreChecked.length==0){
        errorMessage.innerText+=`[ERROR]"配置希望ジャンル欄のチェックがありません\n"`
        genre.innerText=`配置希望ジャンル: empty\n`;
        genre.style.color="red";
        errored=true;
      }
      else if(genreChecked.length>1){
        errorMessage.innerText+=`[ERROR]"配置希望ジャンル"欄に複数のチェックが入っている可能性があります。複数のチェックをしていないか、または他のチェック欄に汚れが無いかを確認してください\n`
        genre.innerText=`配置希望ジャンル: ${genreChecked.join(",")}\n`;
        genre.style.color="red";
        errored=true;
      }
      else{
        if(genreChecked[0]=="その他版権" && sub.includes("その他版権")){
          errorMessage.innerText+=`[ERROR]"配置希望ジャンル"欄で"その他版権"を選択していますが、詳細が記載されていません\n`
          genre.innerText=`配置希望ジャンル: その他版権\n`
          genre.style.color="red";
          errored=true;
        }
        else if(genreChecked[0]=="上記に該当しないジャンル" && sub.includes("上記に該当しないジャンル")){
          errorMessage.innerText+=`[ERROR]"配置希望ジャンル"欄で"上記に該当しないジャンル"を選択していますが、詳細が記載されていません\n`
          genre.innerText=`配置希望ジャンル: 上記に該当しないジャンル\n`
          genre.style.color="red";
          errored=true;
        }
        else{
          genre.innerText=`配置希望ジャンル: ${genreChecked[0]}\n`;
          genre.style.color="green";
          if(genreDis.length>0){
            errorMessage.innerText+=`[ERROR]"配置希望ジャンル"欄の以下のチェックボックス内の塗りつぶしが不足している可能性があります\n項目:${genreDis.join(",")}\n`;
            errored=true;
          }
        }
      }
      if(genreHami.length>0){
        errorMessage.innerText+=`[ERROR]"配置希望ジャンル"欄の以下のチェックボックスの周囲に書き込みが認められます。汚れていたり、またはレ点でチェックしていないか確認してください\n項目: ${genreHami.join(",")}\n`
        errored=true;
      }

      //バージョンチェック
      let vers = await versionCheck(ctx);
      if(vers.includes("skk")){
        vers = vers.replace("skk", "新春けもケット");
      }
      else if(vers.includes("kkk")){
        vers = vers.replace("kkk", "関西けもケット");
      }
      else if(vers.includes("kk")){
        vers = vers.replace("kk", "けもケット");
      }
      else{
        vers="Unknown";
      }

      const correctName="新春けもケット11"

      version.innerText=`テンプレートバージョン: ${vers}\n`;
      if(vers==correctName){
        version.style.color="green";
      }
      else{
        errorMessage.innerText+=`[ERROR]使用されているテンプレートが新春けもケット11のものではありません。または、右下の開催回番号枠内が汚れている可能性があります\n`
        version.style.color="red";
        errored=true;
      }
     //エラーが無ければ不備は検出されませんでしたというメッセージを表示
      if(!errored){
      errorMessage.innerText+="不備は検出されませんでした\n";
      errorMessage.style.color="green";
      }
      //エラーが検出されてその原因ピクセルが特定されている場合、そこと周囲1ピクセルの範囲を赤で表示する
      if(errorPixels.length>0){
        ctx.globalAlpha=0.5;
        ctx.fillStyle="red";
        errorPixels.map(pixel=>{
          let [x,y]=pixel;
          ctx.fillRect(x-10, y-10, 21, 21);
        })
        ctx.globalAlpha=1.0;
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
  let mode=""; //full,gray,mono
  let[full, mono]=[false,true];
  for(let h=0; h<canvas.height;h++){
    for(let w=0;w<canvas.width;w++){
      const p=pixels[h][w];
      if((p.r!=0 && p.r!=255) || (p.g!=0 && p.g!=255) || (p.b!=0 && p.b!=255)){
        mono=false;
      }
      if(!(p.r==p.g && p.r==p.b)){
        full=true;
      }
    }
  }
  if(mono) mode="mono";
  else if(full) mode="full";
  else mode="gray";

  return mode;
}

function seihekiCheck(pixels){

  const _white=new pixel(255,255,255,255);
  const white=_white.strParamater();

  let [all,male,female,shota,loli,futa]=[false,false,false,false,false,false];
  let [allh,maleh,femaleh,shotah,lolih,futah]=[false,false,false,false,false,false];
  let [alld,maled,femaled,shotad,lolid,futad]=[0,0,0,0,0,0];

  //全年齢
  for(let h=464;h<=495;h++){
    for(let w=971;w<=1002;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        alld++;
      }
      if(p.strParamater()!=white){
        all=true;
      }
    }
  }
  for(let w=964;w<=1009;w++){
    if(pixels[457][w].strParamater()!=white){
      allh=true;
    }
    if(pixels[502][w].strParamater()!=white){
      allh=true;
    }
  }
  for(let h=457;h<=502;h++){
    if(pixels[h][964].strParamater()!=white){
      allh=true;
    }
    if(pixels[h][1009].strParamater()!=white){
      allh=true;
    }
  }

  //オス
  for(let h=464;h<=495;h++){
    for(let w=1627;w<=1658;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        maled++;
      }
      if(p.strParamater()!=white){
        male=true;
      }
    }
  }
  for(let w=1620;w<=1665;w++){
    if(pixels[457][w].strParamater()!=white){
      maleh=true;
    }
    if(pixels[502][w].strParamater()!=white){
      maleh=true;
    }
  }
  for(let h=457;h<=502;h++){
    if(pixels[h][1620].strParamater()!=white){
      maleh=true;
    }
    if(pixels[h][1665].strParamater()!=white){
      maleh=true;
    }
  }
  
  //メス
  for(let h=464;h<=495;h++){
    for(let w=1877;w<=1908;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        femaled++;
      }
      if(p.strParamater()!=white){
        female=true;
      }
    }
  }
  for(let w=1870;w<=1915;w++){
    if(pixels[456][w].strParamater()!=white){
      femaleh=true;
    }
    if(pixels[502][w].strParamater()!=white){
      femaleh=true;
    }
  }
  for(let h=456;h<=502;h++){
    if(pixels[h][1870].strParamater()!=white){
      femaleh=true;
    }
    if(pixels[h][1915].strParamater()!=white){
      femaleh=true;
    }
  }

  //ショタ
  for(let h=464;h<=495;h++){
    for(let w=2119;w<=2150;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        shotad++;
      }
      if(p.strParamater()!=white){
        shota=true;
      }
    }
  }
  for(let w=2112;w<=2157;w++){
    if(pixels[457][w].strParamater()!=white){
      shotah=true;
    }
    if(pixels[502][w].strParamater()!=white){
      shotah=true;
    }
  }
  for(let h=457;h<=502;h++){
    if(pixels[h][2112].strParamater()!=white){
      shotah=true;
    }
    if(pixels[h][2157].strParamater()!=white){
      shotah=true;
    }
  }

  //ロリ
  for(let h=464;h<=495;h++){
    for(let w=2395;w<=2427;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        lolid++;
      }
      if(p.strParamater()!=white){
        loli=true;
      }
    }
  }
  for(let w=2388;w<=2434;w++){
    if(pixels[457][w].strParamater()!=white){
      lolih=true;
    }
    if(pixels[502][w].strParamater()!=white){
      lolih=true;
    }
  }
  for(let h=457;h<=502;h++){
    if(pixels[h][2388].strParamater()!=white){
      lolih=true;
    }
    if(pixels[h][2434].strParamater()!=white){
      lolih=true;
    }
  }

  //フタナリ
  for(let h=464;h<=495;h++){
    for(let w=2618;w<=2650;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        futad++;
      }
      if(p.strParamater()!=white){
        futa=true;
      }
    }
  }
  for(let w=2611;w<=2657;w++){
    if(pixels[457][w].strParamater()!=white){
      futah=true;
    }
    if(pixels[502][w].strParamater()!=white){
      futah=true;
    }
  }
  for(let h=456;h<=502;h++){
    if(pixels[h][2611].strParamater()!=white){
      futah=true;
    }
    if(pixels[h][2657].strParamater()!=white){
      futah=true;
    }
  }

  return {
    all:{checked:all, hami:allh, dis:alld, text:"全年齢向けメイン"},
    male:{checked:male, hami:maleh, dis:maled, text:"オス"},
    female:{checked:female, hami:femaleh, dis:femaled, text:"メス"},
    shota:{checked:shota, hami:shotah, dis:shotad, text:"ショタ"},
    loli:{checked:loli, hami:lolih, dis:lolid, text:"ロリ"},
    futa:{checked:futa, hami:futah, dis:futad, text:"フタナリ"}
  };
}

function genreCheck(pixels){
  const sub=[];
  const _white=new pixel(255,255,255,255);
  const white=_white.strParamater();
  let [animaloid,dragon,tetra, bird,pokemon, life, auth, stelse]=[false,false,false,false,false,false,false,false];
  let [animaloidh,dragonh,tetrah,birdh,pokemonh,lifeh,authh,stelseh]=[false,false,false,false,false,false,false,false];
  let [animaloidd,dragond,tetrad,birdd,pokemond,lifed,authd,stelsed]=[0,0,0,0,0,0,0,0];
  
  //獣人
  for(let h=632;h<=664;h++){
    for(let w=971;w<=1003;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        animaloidd++;
      }
      if(p.strParamater()!=white){
        animaloid=true;
      }
    }
  }
  for(let h=625;h<=670;h++){
    if(pixels[h][964].strParamater()!=white){
      animaloidh=true;
    }
    if(pixels[h][1009].strParamater()!=white){
      animaloidh=true;
    }
  }
  for(let w=964;w<=1009;w++){
    if(pixels[625][w].strParamater()!=white){
      animaloidh=true;
    }
    if(pixels[670][w].strParamater()!=white){
      animaloidh=true;
    }
  }
  

  //ドラゴン・爬虫類
  for(let h=632;h<=663;h++){
    for(let w=1232;w<=1265;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        dragond++;
      }
      if(p.strParamater()!=white){
        dragon=true;
      }
    }
  }
  for(let h=625;h<=670;h++){
    if(pixels[h][1226].strParamater()!=white){
      dragonh=true;
    }
    if(pixels[h][1272].strParamater()!=white){
      dragonh=true;
    }
  }
  for(let w=1226;w<=1272;w++){
    if(pixels[625][w].strParamater()!=white){
      dragonh=true;
    }
    if(pixels[670][w].strParamater()!=white){
      dragonh=true;
    }
  }
  

  //四足
  for(let h=632;h<=664;h++){
    for(let w=1792;w<=1824;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        tetrad++;
      }
      if(p.strParamater()!=white){
        tetra=true;
      }
    }
  }for(let h=625;h<=670;h++){
    if(pixels[h][1785].strParamater()!=white){
      tetrah=true;
    }
    if(pixels[h][1831].strParamater()!=white){
      tetrah=true;
    }
  }
  for(let w=1785;w<=1831;w++){
    if(pixels[625][w].strParamater()!=white){
      tetrah=true;
    }
    if(pixels[670][w].strParamater()!=white){
      tetrah=true;
    }
  }

  //鳥類
  for(let h=632;h<=664;h++){
    for(let w=2055;w<=2086;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        birdd++;
      }
      if(p.strParamater()!=white){
        bird=true;
      }
    }
  }for(let h=625;h<=670;h++){
    if(pixels[h][2048].strParamater()!=white){
      birdh=true;
    }
    if(pixels[h][2093].strParamater()!=white){
      birdh=true;
    }
  }
  for(let w=2048;w<=2093;w++){
    if(pixels[625][w].strParamater()!=white){
      birdh=true;
    }
    if(pixels[670][w].strParamater()!=white){
      birdh=true;
    }
  }

  //ポケモン
  for(let h=632;h<=664;h++){
    for(let w=2317;w<=2349;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        pokemond++;
      }
      if(p.strParamater()!=white){
        pokemon=true;
      }
    }
  }for(let h=625;h<=670;h++){
    if(pixels[h][2310].strParamater()!=white){
      pokemonh=true;
    }
    if(pixels[h][2356].strParamater()!=white){
      pokemonh=true;
    }
  }
  for(let w=2310;w<=2356;w++){
    if(pixels[625][w].strParamater()!=white){
      pokemonh=true;
    }
    if(pixels[670][w].strParamater()!=white){
      pokemonh=true;
    }
  }

  //ライフワンダーズ
  for(let h=632;h<=664;h++){
    for(let w=2670;w<=2702;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        lifed++;
      }
      if(p.strParamater()!=white){
        life=true;
      }
    }
  }for(let h=625;h<=670;h++){
    if(pixels[h][2663].strParamater()!=white){
      lifeh=true;
    }
    if(pixels[h][2709].strParamater()!=white){
      lifeh=true;
    }
  }
  for(let w=2663;w<=2709;w++){
    if(pixels[625][w].strParamater()!=white){
      lifeh=true;
    }
    if(pixels[670][w].strParamater()!=white){
      lifeh=true;
    }
  }

  //その他版権
  for(let h=715;h<=747;h++){
    for(let w=971;w<=1002;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        authd++;
      }
      if(p.strParamater()!=white){
        auth=true;
      }
    }
  }
  for(let h=708;h<=754;h++){
    if(pixels[h][964].strParamater()!=white){
      authh=true;
    }
    if(pixels[h][1009].strParamater()!=white){
      authh=true;
    }
  }
  for(let w=964;w<=1009;w++){
    if(pixels[708][w].strParamater()!=white){
      authh=true;
    }
    if(pixels[754][w].strParamater()!=white){
      authh=true;
    }
  }
  if(auth){
    let cnt=0;
    for(let h=700;h<=753;h++){
      for(let w=1309;w<=2798;w++){
        if(pixels[h][w].strParamater()!=white){
          cnt++;
        }
      }
    }
    if(cnt<100){
      sub.push("その他版権");
    }
  }

  //上記に該当しないジャンル
  for(let h=798;h<=830;h++){
    for(let w=971;w<=1002;w++){
      const p=pixels[h][w];
      if(p.r>128 || p.g>128 || p.b>128){
        stelsed++;
      }
      if(p.strParamater()!=white){
        stelse=true;
      }
    }
  }
  for(let h=791;h<=837;h++){
    if(pixels[h][964].strParamater()!=white){
      stelseh=true;
    }
    if(pixels[h][1009].strParamater()!=white){
      stelseh=true;
    }
  }
  for(let w=964;w<=1009;w++){
    if(pixels[791][w].strParamater()!=white){
      stelseh=true;
    }
    if(pixels[837][w].strParamater()!=white){
      stelseh=true;
    }
  }
  if(stelse){
    let cnt=0;
    for(let h=777;h<=836;h++){
      for(let w=1648;w<=3129;w++){
        if(pixels[h][w].strParamater()!=white){
          cnt++;
        }
      }
    }
    if(cnt<100){
      sub.push("上記に該当しないジャンル");
    }
  }

  return {
    animaloid:{checked:animaloid, hami:animaloidh, dis:animaloidd, text:"獣人"},
    dragon:{checked:dragon, hami:dragonh, dis:dragond, text:"ドラゴン・爬虫類"},
    tetra:{checked:tetra, hami:tetrah, dis:tetrad, text:"四足"},
    bird:{checked:bird, hami:birdh, dis:birdd, text:"鳥類"},
    pokemon:{checked:pokemon, hami:pokemonh, dis:pokemond, text:"ポケモン"},
    life:{checked:life, hami:lifeh, dis:lifed, text:"ライフワンダーズ"},
    auth:{checked:auth, hami:authh, dis:authd, text:"その他版権"},
    stelse:{checked:stelse, hami:stelseh, dis:stelsed, text:"上記に該当しないジャンル"},
    sub:sub
  };
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

async function versionCheck(ctx){
  const [hmin,hmax,wmin, wmax]=[1293, 1350, 3027, 3240];
  const [h, w]=[hmax-hmin+1, wmax-wmin+1];
  const worker= await Tesseract.createWorker(['eng']);
  const result = await worker.recognize(ctx.canvas, {rectangle:{
    top: hmin,
    left: wmin,
    height:h,
    width:w
  }});
  const version=result.data.text.replace(" ", "").replace("\n", "");
  return version;
}
