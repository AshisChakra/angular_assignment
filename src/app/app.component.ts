import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { UserService } from './services/user.service';
import { User } from './models/user.interface';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * Main App Component
 * Handles user listing, searching, filtering, and pagination
 * with shareable state through URL query parameters
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatTableModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'angular_assignment';
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  searchQuery = '';
  loading = false;
  
  // ========== PAGINATION PROPERTIES ==========
  pageSize = 5;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 20];
  
  // ========== RXJS SUBJECTS AND SUBSCRIPTIONS ==========
  private searchSubject = new Subject<string>();
  private subscriptions = new Subscription();

 
  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const searchSub = this.searchSubject.pipe(
      debounceTime(300),           
      distinctUntilChanged()        
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
    
    this.subscriptions.add(searchSub);

    const paramsSub = this.route.queryParams.subscribe(params => {
      this.searchQuery = params['search'] || '';
      this.pageIndex = parseInt(params['page']) || 0;
      this.pageSize = parseInt(params['size']) || 5;
      this.loadUsers();
    });
    this.subscriptions.add(paramsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadUsers(): void {
    this.loading = true;
    const usersSub = this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.filterUsers();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching users:', error);
        this.loading = false;
      }
    });
    this.subscriptions.add(usersSub);
  }

  /**
   * Handles search input changes
   * Emits search term to debounced subject
   */
  onSearchChange(searchTerm: string): void {
    this.searchQuery = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  performSearch(searchTerm: string): void {
    this.pageIndex = 0;
    this.updateUrl();
    this.filterUsers();
  }

  /**
   * Filters users array based on current search query
   * Filters by user name (case-insensitive)
   * Then updates pagination
   */
  filterUsers(): void {
    if (!this.searchQuery.trim()) {
      this.filteredUsers = [...this.users];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        user.name.toLowerCase().includes(query)
      );
    }
    this.updatePagination();
  }

  /**
   * Updates the paginatedUsers array based on current page settings
   * Slices the filtered users array to show only current page items
   */
  updatePagination(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateUrl();
    this.updatePagination();
  }

  /**
   * Updates the browser URL with current state parameters
   * Enables shareable state - users can share URLs with filters/pagination
   * Uses replaceUrl to avoid cluttering browser history
   */
  updateUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery || null,
        page: this.pageIndex || null,
        size: this.pageSize !== 5 ? this.pageSize : null
      },
      queryParamsHandling: 'merge',  
      replaceUrl: true                
    });
  }

  /**
   * Clears the search input and resets search
   * Called when user clicks the X button in search field
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.onSearchChange('');
  }
}