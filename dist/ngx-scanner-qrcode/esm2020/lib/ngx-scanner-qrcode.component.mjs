import { Component, EventEmitter, ViewChild } from '@angular/core';
import jsQR from './qrcode';
import * as i0 from "@angular/core";
export class NgxScannerQrcodeComponent {
    constructor() {
        // @Output
        // @Export
        this.error = new EventEmitter();
        this.event = new EventEmitter();
        // @Export
        this.medias = { video: { facingMode: "environment" } };
        this.isStart = false;
        this.isLoading = false;
        /**
         * Properties
         * CanvasRenderingContext2D
         * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
         */
        this.frameConfig = {
            lineWidth: 4,
            strokeStyle: '#008000'
        };
        this.textConfig = {
            font: '30px serif',
            fillStyle: '#008000'
        };
    }
    ngOnInit() {
        this.initBackgroundColor();
    }
    /**
     * initBackgroundColor
     */
    initBackgroundColor() {
        const ctx = this.canvas.nativeElement.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    }
    /**
     * toggleCamera
     */
    toggleCamera() {
        if (this.isStart)
            this.stop();
        else
            this.start();
    }
    /**
     * start
     * @returns
     */
    start() {
        if (this.isStart)
            return;
        this.isLoading = true;
        /**
         * MediaStream
         * Use facingMode: environment to attemt to get the front camera on phones
         */
        navigator.mediaDevices.getUserMedia(this.medias).then((stream) => {
            this.isStart = true;
            this.video.nativeElement.srcObject = stream;
            this.video.nativeElement.setAttribute("playsinline", 'true'); // required to tell iOS safari we don't want fullscreen
            this.video.nativeElement.play();
            requestAnimationFrame(scanner);
        }).catch(() => this.stop());
        /**
         * drawFrame
         */
        const ctx = this.canvas.nativeElement.getContext('2d');
        const drawFrame = (begin, end) => {
            ctx.beginPath();
            ctx.moveTo(begin.x, begin.y);
            ctx.lineTo(end.x, end.y);
            for (let key in this.frameConfig) {
                ctx[key] = this.frameConfig[key];
            }
            ctx.stroke();
        };
        const drawData = (code) => {
            if (this.textConfig) {
                for (let key in this.textConfig) {
                    ctx[key] = this.textConfig[key];
                }
                const textString = code.data;
                const metrics = ctx.measureText(textString);
                ctx.fillText(textString, ((code.location.bottomLeftCorner.x + code.location.bottomRightCorner.x) / 2) - (metrics.width / 2), code.location.bottomRightCorner.y + 40);
            }
        };
        /**
         * scanner
         */
        const scanner = () => {
            if (this.video.nativeElement.readyState === this.video.nativeElement.HAVE_ENOUGH_DATA) {
                this.canvas.nativeElement.height = this.video.nativeElement.videoHeight;
                this.canvas.nativeElement.width = this.video.nativeElement.videoWidth;
                ctx.drawImage(this.video.nativeElement, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
                const imageData = ctx.getImageData(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });
                if (code) {
                    drawFrame(code.location.topLeftCorner, code.location.topRightCorner);
                    drawFrame(code.location.topRightCorner, code.location.bottomRightCorner);
                    drawFrame(code.location.bottomRightCorner, code.location.bottomLeftCorner);
                    drawFrame(code.location.bottomLeftCorner, code.location.topLeftCorner);
                    drawData(code);
                    this.event.emit(code?.data ?? null);
                    this.data = code?.data ?? null;
                }
                this.isLoading = false;
                this.canvas.nativeElement.onclick = () => this.video.nativeElement.paused ? this.play() : this.pause(); // pause when clicked on screen and resume on next click
            }
            requestAnimationFrame(scanner);
        };
    }
    /**
     * Video play
     * @return void
     */
    play() {
        this.video?.nativeElement?.play();
    }
    /**
     * Video pause
     * @return void
     */
    pause() {
        this.video?.nativeElement?.pause();
    }
    /**
     * Video stop
     * @return void
     */
    stop() {
        this.isStart = false;
        this.isLoading = false;
        this.event.emit(null);
        try {
            this.video?.nativeElement?.srcObject?.getTracks()?.forEach((track) => track?.stop());
        }
        catch (error) {
            this.error.emit(error);
        }
    }
    /**
     * Download image
     * @param fileName eg: demo.png
     * @return string
     */
    download(fileName) {
        const dataURL = this.canvas?.nativeElement?.toDataURL(`image/${fileName?.split('.')?.slice(-1)?.toString()}`);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataURL;
        link.click();
        return dataURL;
    }
    ngOnDestroy() {
        this.pause();
    }
}
NgxScannerQrcodeComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.3", ngImport: i0, type: NgxScannerQrcodeComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
NgxScannerQrcodeComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "14.2.3", type: NgxScannerQrcodeComponent, selector: "ngx-scanner-qrcode", inputs: { frameConfig: "frameConfig", textConfig: "textConfig" }, outputs: { data: "data", error: "error" }, host: { classAttribute: "ngx-scanner-qrcode" }, viewQueries: [{ propertyName: "video", first: true, predicate: ["video"], descendants: true, static: true }, { propertyName: "canvas", first: true, predicate: ["canvas"], descendants: true, static: true }], exportAs: ["scanner"], ngImport: i0, template: `<canvas #canvas [style.width.%]="100" [style.height.%]="100"></canvas><video #video playsinline style="display: none"></video><ng-content></ng-content>`, isInline: true });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.3", ngImport: i0, type: NgxScannerQrcodeComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'ngx-scanner-qrcode',
                    template: `<canvas #canvas [style.width.%]="100" [style.height.%]="100"></canvas><video #video playsinline style="display: none"></video><ng-content></ng-content>`,
                    queries: {
                        video: new ViewChild('video', { static: true }),
                        canvas: new ViewChild('canvas', { static: true })
                    },
                    inputs: ['frameConfig', 'textConfig'],
                    host: { 'class': 'ngx-scanner-qrcode' },
                    outputs: ['data', 'error'],
                    exportAs: 'scanner',
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmd4LXNjYW5uZXItcXJjb2RlLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL25neC1zY2FubmVyLXFyY29kZS9zcmMvbGliL25neC1zY2FubmVyLXFyY29kZS5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBYyxZQUFZLEVBQXFCLFNBQVMsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNsRyxPQUFPLElBQUksTUFBTSxVQUFVLENBQUM7O0FBYzVCLE1BQU0sT0FBTyx5QkFBeUI7SUFadEM7UUFtQkUsVUFBVTtRQUNWLFVBQVU7UUFDSCxVQUFLLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQUNoQyxVQUFLLEdBQUcsSUFBSSxZQUFZLEVBQVUsQ0FBQztRQUUxQyxVQUFVO1FBQ0gsV0FBTSxHQUEyQixFQUFFLEtBQUssRUFBRSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDO1FBQzFFLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFDaEIsY0FBUyxHQUFHLEtBQUssQ0FBQztRQUd6Qjs7OztXQUlHO1FBQ0ksZ0JBQVcsR0FBVztZQUMzQixTQUFTLEVBQUUsQ0FBQztZQUNaLFdBQVcsRUFBRSxTQUFTO1NBQ3ZCLENBQUM7UUFDSyxlQUFVLEdBQVc7WUFDMUIsSUFBSSxFQUFFLFlBQVk7WUFDbEIsU0FBUyxFQUFFLFNBQVM7U0FDckIsQ0FBQztLQWlKSDtJQS9JQyxRQUFRO1FBQ04sSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ssbUJBQW1CO1FBQ3pCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQTZCLENBQUM7UUFDbkYsR0FBRyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDMUIsR0FBRyxDQUFDLFFBQVEsQ0FB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T0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO3dCQUMvQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO3FCQUNsRDtvQkFDRCxNQUFNLEVBQUUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDO29CQUNyQyxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUU7b0JBQ3ZDLE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7b0JBQzFCLFFBQVEsRUFBRSxTQUFTO2lCQUNwQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgRWxlbWVudFJlZiwgRXZlbnRFbWl0dGVyLCBPbkRlc3Ryb3ksIE9uSW5pdCwgVmlld0NoaWxkIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQganNRUiBmcm9tICcuL3FyY29kZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ25neC1zY2FubmVyLXFyY29kZScsXG4gIHRlbXBsYXRlOiBgPGNhbnZhcyAjY2FudmFzIFtzdHlsZS53aWR0aC4lXT1cIjEwMFwiIFtzdHlsZS5oZWlnaHQuJV09XCIxMDBcIj48L2NhbnZhcz48dmlkZW8gI3ZpZGVvIHBsYXlzaW5saW5lIHN0eWxlPVwiZGlzcGxheTogbm9uZVwiPjwvdmlkZW8+PG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PmAsXG4gIHF1ZXJpZXM6IHtcbiAgICB2aWRlbzogbmV3IFZpZXdDaGlsZCgndmlkZW8nLCB7IHN0YXRpYzogdHJ1ZSB9KSxcbiAgICBjYW52YXM6IG5ldyBWaWV3Q2hpbGQoJ2NhbnZhcycsIHsgc3RhdGljOiB0cnVlIH0pXG4gIH0sXG4gIGlucHV0czogWydmcmFtZUNvbmZpZycsICd0ZXh0Q29uZmlnJ10sXG4gIGhvc3Q6IHsgJ2NsYXNzJzogJ25neC1zY2FubmVyLXFyY29kZScgfSxcbiAgb3V0cHV0czogWydkYXRhJywgJ2Vycm9yJ10sXG4gIGV4cG9ydEFzOiAnc2Nhbm5lcicsXG59KVxuZXhwb3J0IGNsYXNzIE5neFNjYW5uZXJRcmNvZGVDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG5cbiAgLy8gQFZpZXdDaGlsZFxuICAvLyBARXhwb3J0XG4gIHB1YmxpYyB2aWRlbyE6IEVsZW1lbnRSZWY7XG4gIHB1YmxpYyBjYW52YXMhOiBFbGVtZW50UmVmO1xuXG4gIC8vIEBPdXRwdXRcbiAgLy8gQEV4cG9ydFxuICBwdWJsaWMgZXJyb3IgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgcHVibGljIGV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcjxzdHJpbmc+KCk7XG5cbiAgLy8gQEV4cG9ydFxuICBwdWJsaWMgbWVkaWFzOiBNZWRpYVN0cmVhbUNvbnN0cmFpbnRzID0geyB2aWRlbzogeyBmYWNpbmdNb2RlOiBcImVudmlyb25tZW50XCIgfSB9O1xuICBwdWJsaWMgaXNTdGFydCA9IGZhbHNlO1xuICBwdWJsaWMgaXNMb2FkaW5nID0gZmFsc2U7XG4gIHB1YmxpYyBkYXRhOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFByb3BlcnRpZXNcbiAgICogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DYW52YXNSZW5kZXJpbmdDb250ZXh0MkRcbiAgICovXG4gIHB1YmxpYyBmcmFtZUNvbmZpZzogT2JqZWN0ID0ge1xuICAgIGxpbmVXaWR0aDogNCxcbiAgICBzdHJva2VTdHlsZTogJyMwMDgwMDAnXG4gIH07XG4gIHB1YmxpYyB0ZXh0Q29uZmlnOiBPYmplY3QgPSB7XG4gICAgZm9udDogJzMwcHggc2VyaWYnLFxuICAgIGZpbGxTdHlsZTogJyMwMDgwMDAnXG4gIH07XG5cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5pbml0QmFja2dyb3VuZENvbG9yKCk7XG4gIH1cblxuICAvKipcbiAgICogaW5pdEJhY2tncm91bmRDb2xvclxuICAgKi9cbiAgcHJpdmF0ZSBpbml0QmFja2dyb3VuZENvbG9yKCkge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuY2FudmFzLm5hdGl2ZUVsZW1lbnQuZ2V0Q29udGV4dCgnMmQnKSBhcyBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XG4gICAgY3R4LmZpbGxTdHlsZSA9ICcjMDAwMDAwJztcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgdGhpcy5jYW52YXMubmF0aXZlRWxlbWVudC53aWR0aCwgdGhpcy5jYW52YXMubmF0aXZlRWxlbWVudC5oZWlnaHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIHRvZ2dsZUNhbWVyYVxuICAgKi9cbiAgcHVibGljIHRvZ2dsZUNhbWVyYSgpIHtcbiAgICBpZiAodGhpcy5pc1N0YXJ0KSB0aGlzLnN0b3AoKTtcbiAgICBlbHNlIHRoaXMuc3RhcnQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzdGFydFxuICAgKiBAcmV0dXJucyBcbiAgICovXG4gIHB1YmxpYyBzdGFydCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pc1N0YXJ0KSByZXR1cm47XG5cbiAgICB0aGlzLmlzTG9hZGluZyA9IHRydWU7XG5cbiAgICAvKipcbiAgICAgKiBNZWRpYVN0cmVhbVxuICAgICAqIFVzZSBmYWNpbmdNb2RlOiBlbnZpcm9ubWVudCB0byBhdHRlbXQgdG8gZ2V0IHRoZSBmcm9udCBjYW1lcmEgb24gcGhvbmVzXG4gICAgICovXG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEodGhpcy5tZWRpYXMpLnRoZW4oKHN0cmVhbTogTWVkaWFTdHJlYW0pID0+IHtcbiAgICAgIHRoaXMuaXNTdGFydCA9IHRydWU7XG4gICAgICB0aGlzLnZpZGVvLm5hdGl2ZUVsZW1lbnQuc3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgICAgdGhpcy52aWRlby5uYXRpdmVFbGVtZW50LnNldEF0dHJpYnV0ZShcInBsYXlzaW5saW5lXCIsICd0cnVlJyk7IC8vIHJlcXVpcmVkIHRvIHRlbGwgaU9TIHNhZmFyaSB3ZSBkb24ndCB3YW50IGZ1bGxzY3JlZW5cbiAgICAgIHRoaXMudmlkZW8ubmF0aXZlRWxlbWVudC5wbGF5KCk7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc2Nhbm5lcik7XG4gICAgfSkuY2F0Y2goKCkgPT4gdGhpcy5zdG9wKCkpO1xuXG4gICAgLyoqXG4gICAgICogZHJhd0ZyYW1lXG4gICAgICovXG4gICAgY29uc3QgY3R4ID0gdGhpcy5jYW52YXMubmF0aXZlRWxlbWVudC5nZXRDb250ZXh0KCcyZCcpIGFzIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDtcbiAgICBjb25zdCBkcmF3RnJhbWUgPSAoYmVnaW4sIGVuZCkgPT4ge1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4Lm1vdmVUbyhiZWdpbi54LCBiZWdpbi55KTtcbiAgICAgIGN0eC5saW5lVG8oZW5kLngsIGVuZC55KTtcbiAgICAgIGZvciAobGV0IGtleSBpbiB0aGlzLmZyYW1lQ29uZmlnKSB7XG4gICAgICAgIGN0eFtrZXldID0gdGhpcy5mcmFtZUNvbmZpZ1trZXldO1xuICAgICAgfVxuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IGRyYXdEYXRhID0gKGNvZGUpID0+IHtcbiAgICAgIGlmICh0aGlzLnRleHRDb25maWcpIHtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHRoaXMudGV4dENvbmZpZykge1xuICAgICAgICAgIGN0eFtrZXldID0gdGhpcy50ZXh0Q29uZmlnW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGV4dFN0cmluZyA9IGNvZGUuZGF0YTtcbiAgICAgICAgY29uc3QgbWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dCh0ZXh0U3RyaW5nKTtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRleHRTdHJpbmcsICgoY29kZS5sb2NhdGlvbi5ib3R0b21MZWZ0Q29ybmVyLnggKyBjb2RlLmxvY2F0aW9uLmJvdHRvbVJpZ2h0Q29ybmVyLngpIC8gMikgLSAobWV0cmljcy53aWR0aCAvIDIpLCBjb2RlLmxvY2F0aW9uLmJvdHRvbVJpZ2h0Q29ybmVyLnkgKyA0MCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2Nhbm5lclxuICAgICAqL1xuICAgIGNvbnN0IHNjYW5uZXIgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy52aWRlby5uYXRpdmVFbGVtZW50LnJlYWR5U3RhdGUgPT09IHRoaXMudmlkZW8ubmF0aXZlRWxlbWVudC5IQVZFX0VOT1VHSF9EQVRBKSB7XG4gICAgICAgIHRoaXMuY2FudmFzLm5hdGl2ZUVsZW1lbnQuaGVpZ2h0ID0gdGhpcy52aWRlby5uYXRpdmVFbGVtZW50LnZpZGVvSGVpZ2h0O1xuICAgICAgICB0aGlzLmNhbnZhcy5uYXRpdmVFbGVtZW50LndpZHRoID0gdGhpcy52aWRlby5uYXRpdmVFbGVtZW50LnZpZGVvV2lkdGg7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy52aWRlby5uYXRpdmVFbGVtZW50LCAwLCAwLCB0aGlzLmNhbnZhcy5uYXRpdmVFbGVtZW50LndpZHRoLCB0aGlzLmNhbnZhcy5uYXRpdmVFbGVtZW50LmhlaWdodCk7XG4gICAgICAgIGNvbnN0IGltYWdlRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5jYW52YXMubmF0aXZlRWxlbWVudC53aWR0aCwgdGhpcy5jYW52YXMubmF0aXZlRWxlbWVudC5oZWlnaHQpO1xuICAgICAgICBjb25zdCBjb2RlID0ganNRUihpbWFnZURhdGEuZGF0YSwgaW1hZ2VEYXRhLndpZHRoLCBpbWFnZURhdGEuaGVpZ2h0LCB7XG4gICAgICAgICAgaW52ZXJzaW9uQXR0ZW1wdHM6IFwiZG9udEludmVydFwiLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGNvZGUpIHtcbiAgICAgICAgICBkcmF3RnJhbWUoY29kZS5sb2NhdGlvbi50b3BMZWZ0Q29ybmVyLCBjb2RlLmxvY2F0aW9uLnRvcFJpZ2h0Q29ybmVyKTtcbiAgICAgICAgICBkcmF3RnJhbWUoY29kZS5sb2NhdGlvbi50b3BSaWdodENvcm5lciwgY29kZS5sb2NhdGlvbi5ib3R0b21SaWdodENvcm5lcik7XG4gICAgICAgICAgZHJhd0ZyYW1lKGNvZGUubG9jYXRpb24uYm90dG9tUmlnaHRDb3JuZXIsIGNvZGUubG9jYXRpb24uYm90dG9tTGVmdENvcm5lcik7XG4gICAgICAgICAgZHJhd0ZyYW1lKGNvZGUubG9jYXRpb24uYm90dG9tTGVmdENvcm5lciwgY29kZS5sb2NhdGlvbi50b3BMZWZ0Q29ybmVyKTtcbiAgICAgICAgICBkcmF3RGF0YShjb2RlKTtcbiAgICAgICAgICB0aGlzLmV2ZW50LmVtaXQoY29kZT8uZGF0YSA/PyBudWxsKTtcbiAgICAgICAgICB0aGlzLmRhdGEgPSBjb2RlPy5kYXRhID8/IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc0xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jYW52YXMubmF0aXZlRWxlbWVudC5vbmNsaWNrID0gKCkgPT4gdGhpcy52aWRlby5uYXRpdmVFbGVtZW50LnBhdXNlZCA/IHRoaXMucGxheSgpIDogdGhpcy5wYXVzZSgpOyAvLyBwYXVzZSB3aGVuIGNsaWNrZWQgb24gc2NyZWVuIGFuZCByZXN1bWUgb24gbmV4dCBjbGlja1xuICAgICAgfVxuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHNjYW5uZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBWaWRlbyBwbGF5XG4gICAqIEByZXR1cm4gdm9pZFxuICAgKi9cbiAgcHVibGljIHBsYXkoKTogdm9pZCB7XG4gICAgdGhpcy52aWRlbz8ubmF0aXZlRWxlbWVudD8ucGxheSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZpZGVvIHBhdXNlXG4gICAqIEByZXR1cm4gdm9pZFxuICAgKi9cbiAgcHVibGljIHBhdXNlKCk6IHZvaWQge1xuICAgIHRoaXMudmlkZW8/Lm5hdGl2ZUVsZW1lbnQ/LnBhdXNlKCk7XG4gIH1cblxuICAvKipcbiAgICogVmlkZW8gc3RvcFxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICovXG4gIHB1YmxpYyBzdG9wKCk6IHZvaWQge1xuICAgIHRoaXMuaXNTdGFydCA9IGZhbHNlO1xuICAgIHRoaXMuaXNMb2FkaW5nID0gZmFsc2U7XG4gICAgdGhpcy5ldmVudC5lbWl0KG51bGwpO1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnZpZGVvPy5uYXRpdmVFbGVtZW50Py5zcmNPYmplY3Q/LmdldFRyYWNrcygpPy5mb3JFYWNoKCh0cmFjazogYW55KSA9PiB0cmFjaz8uc3RvcCgpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5lcnJvci5lbWl0KGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRG93bmxvYWQgaW1hZ2VcbiAgICogQHBhcmFtIGZpbGVOYW1lIGVnOiBkZW1vLnBuZ1xuICAgKiBAcmV0dXJuIHN0cmluZ1xuICAgKi9cbiAgcHVibGljIGRvd25sb2FkKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGRhdGFVUkwgPSB0aGlzLmNhbnZhcz8ubmF0aXZlRWxlbWVudD8udG9EYXRhVVJMKGBpbWFnZS8ke2ZpbGVOYW1lPy5zcGxpdCgnLicpPy5zbGljZSgtMSk/LnRvU3RyaW5nKCl9YCk7XG4gICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICBsaW5rLmRvd25sb2FkID0gZmlsZU5hbWU7XG4gICAgbGluay5ocmVmID0gZGF0YVVSTDtcbiAgICBsaW5rLmNsaWNrKCk7XG4gICAgcmV0dXJuIGRhdGFVUkw7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnBhdXNlKCk7XG4gIH1cbn0iXX0=