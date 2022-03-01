import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import jsQR from './qrcode';

@Component({
  selector: 'ngx-scanner-qrcode',
  template: `<canvas #canvas [style.height.px]="height" [style.width.px]="width"></canvas>`,
  exportAs: 'scanner'
})
export class NgxScannerQrcodeComponent {

  @ViewChild('canvas', { static: true }) canvasElm: ElementRef;

  @Input() color: string = '#008000';
  @Input() height: number = 300;
  @Input() width: number = 480;
  @Input() line: number = 2;
  @Output() data = new EventEmitter<string>();

  private videoElm: any;
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
    this.isLoading = true;
    this.videoElm = document.createElement('video');
    // Use facingMode: environment to attemt to get the front camera on phones
    navigator.mediaDevices.getUserMedia(this.medias).then((stream: MediaStream) => {
      this.isStart = true;
      this.videoElm.srcObject = stream;
      this.videoElm.setAttribute("playsinline", 'true'); // required to tell iOS safari we don't want fullscreen
      this.videoElm.play();
      requestAnimationFrame(scanner);
    }).catch(error => {
      this.stop();
      console.log(error);
    });

    const ctx = this.canvasElm.nativeElement.getContext('2d') as CanvasRenderingContext2D;
    const drawFrame = (begin, end) => {
      ctx.beginPath();
      ctx.moveTo(begin.x, begin.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = this.line;
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }

    const scanner = () => {
      if (this.videoElm.readyState === this.videoElm.HAVE_ENOUGH_DATA) {
        ctx.drawImage(this.videoElm, 0, 0, this.width, this.height);
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
    this.data.emit(null);
    this.isStart = false;
    this.videoElm && this.videoElm.srcObject.getTracks().forEach(track => track.stop());
  }
}
