import {
  Component,
  Inject,
  PLATFORM_ID,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  templateUrl: './map-picker.html',
})
export class MapPickerComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @Output() locationSelect = new EventEmitter<{ lat: number; lng: number }>();

  map: any;
  marker: any;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const L = await import('leaflet');

    if (!this.mapContainer) return;

    this.map = L.map(this.mapContainer.nativeElement).setView([10.76, 106.66], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.setMarker(e.latlng.lat, e.latlng.lng);
      this.locationSelect.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  setMarker(lat: number, lng: number) {
    if (this.marker) this.marker.remove();

    const L = (window as any).L;

    // Tạo DivIcon với HTML của iconify
    const icon = L.divIcon({
      className: '', // để không dùng CSS mặc định
      html: '<iconify-icon icon="mdi:map-marker" width="32" height="32" style="color:red;"></iconify-icon>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    this.marker = L.marker([lat, lng], { icon }).addTo(this.map);
    this.map.setView([lat, lng], 15);
  }
}
