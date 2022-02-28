import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import jsQR from './qrcode';

@Component({
  selector: 'ngx-scanner-qrcode',
  template: `<canvas #canvas [style.height.px]="height" [style.width.px]="width"></canvas>
  <video #video autoplay playsinline [style.height.px]="200" [style.width.px]="300" [style.display]="'none'"></video>`,
  exportAs: 'scanner'
})
export class NgxScannerQrcodeComponent {

  @ViewChild('video', { static: true }) videoElm: ElementRef;
  @ViewChild('canvas', { static: true }) canvasElm: ElementRef;

  @Input() color: string = '#008000';
  @Input() height: number = 300;
  @Input() width: number = 450;
  @Input() line: number = 2;
  @Output() data = new EventEmitter<string>();

  private medias: MediaStreamConstraints = { video: { facingMode: "environment" } };
  public isLoading = false;
  public isStart = false;

  constructor() { }

  ngOnInit(): void {
    this.initBackgroundColor();
  }

  private initBackgroundColor() {
    const ctx = this.canvasElm.nativeElement.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.width, this.height);
  }

  public toggleCamera() {
    if (this.isStart) {
      this.stop()
    } else {
      this.start();
    }
  }

  public start() {
    if (this.isStart)
      return;
    const canvas = this.canvasElm.nativeElement;
    const video = this.videoElm.nativeElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const drawFrame = (begin, end) => {
      ctx.beginPath();
      ctx.moveTo(begin.x, begin.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = this.line;
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }
    // Use facingMode: environment to attemt to get the front camera on phones
    navigator.mediaDevices.getUserMedia(this.medias).then((stream: MediaStream) => {
      video.srcObject = stream;
      video.setAttribute("playsinline", 'true'); // required to tell iOS safari we don't want fullscreen
      video.play();
      this.isStart = true;
      this.isLoading = true;
    }).then(res => {
      requestAnimationFrame(scanner);
    }).catch(error => {
      this.stop();
      console.log(error);
    });

    const scanner = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, this.width, this.height);
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code) {
          drawFrame(code.location.topLeftCorner, code.location.topRightCorner);
          drawFrame(code.location.topRightCorner, code.location.bottomRightCorner);
          drawFrame(code.location.bottomRightCorner, code.location.bottomLeftCorner);
          drawFrame(code.location.bottomLeftCorner, code.location.topLeftCorner);
          this.data.emit(code.data ? code.data : '');
        }
        this.isLoading = false;
      }
      requestAnimationFrame(scanner);
    }
  }

  public stop() {
    this.isStart = false;
    this.videoElm.nativeElement && this.videoElm.nativeElement.srcObject.getTracks().forEach(track => track.stop());
  }
}
