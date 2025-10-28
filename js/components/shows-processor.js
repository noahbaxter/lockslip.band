// Shows Processor Component - Handles complex shows categorization and tour logic
class ShowsProcessor {
    constructor() {
        this.today = new Date();
        this.today.setHours(0, 0, 0, 0);

        // Month abbreviation to number mapping
        this.monthMap = {
            'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3,
            'MAY': 4, 'JUN': 5, 'JUL': 6, 'AUG': 7,
            'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
        };
    }

    // Helper to parse month abbreviation to date
    parseMonthYear(monthAbbr, day, year) {
        const monthNum = this.monthMap[monthAbbr];
        if (monthNum === undefined) {
            console.warn(`Unknown month abbreviation: ${monthAbbr}`);
            return null;
        }
        const date = new Date(year, monthNum, day);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    // Helper to safely get timestamp from a date (handles both Date objects and strings)
    getTimestamp(date) {
        if (date instanceof Date) {
            return date.getTime();
        }
        return new Date(date).getTime();
    }

    // Helper to sort shows by date
    sortByDate(a, b, descending = false) {
        const timeA = this.getTimestamp(a.showDate);
        const timeB = this.getTimestamp(b.showDate);
        return descending ? timeB - timeA : timeA - timeB;
    }

    // Main processing function for shows data
    processShows(showsData) {
        if (!showsData) return { futureItems: [], pastItems: [], showsWithPosters: [] };

        // Create a map of all shows by ID for easy lookup
        const allShowsById = {};
        showsData.shows.forEach(show => {
            allShowsById[show.id] = show;
        });

        // Process tours and get processed tours with show objects
        const { processedTours, tourShowIds } = this.processTours(showsData.tours, allShowsById);

        // Get individual shows (those not part of any tour)
        const individualShows = showsData.shows.filter(show => !tourShowIds.has(show.id));

        // Categorize shows and tours
        const categorizedIndividualShows = individualShows.map(show => this.categorizeShow(show));
        const categorizedTours = processedTours.map(tour => this.categorizeTour(tour));

        // Create chronologically mixed arrays for past and future
        const { pastItems, futureItems } = this.createChronologicalArrays(categorizedIndividualShows, categorizedTours);

        // Collect all shows with posters for navigation
        const showsWithPosters = this.collectShowsWithPosters(pastItems, futureItems);

        return { futureItems, pastItems, showsWithPosters };
    }

    // Process tours and map show IDs to actual show objects
    processTours(tours, allShowsById) {
        const tourShowIds = new Set();
        const processedTours = [];
        
        if (tours) {
            tours.forEach(tour => {
                if (tour.shows && tour.shows.length > 0) {
                    // Map show IDs to actual show objects
                    const tourShows = tour.shows
                        .map(showId => allShowsById[showId])
                        .filter(show => show); // Filter out any missing shows
                    
                    if (tourShows.length > 0) {
                        processedTours.push({
                            ...tour,
                            shows: tourShows
                        });
                        
                        // Track which shows are part of tours
                        tour.shows.forEach(showId => tourShowIds.add(showId));
                    }
                }
            });
        }

        return { processedTours, tourShowIds };
    }

    // Helper function to categorize individual shows
    categorizeShow(show) {
        const showDate = this.parseMonthYear(show.date.month, show.date.day, show.date.year);
        return {
            ...show,
            actuallyPast: showDate < this.today, // Shows on today or in the future are not past
            showDate: showDate
        };
    }

    // Helper function to categorize tours
    categorizeTour(tour) {
        const categorizedTourShows = tour.shows.map(show => this.categorizeShow(show));
        const tourStartDate = this.parseMonthYear(tour.startDate.month, tour.startDate.day, tour.startDate.year);
        const tourEndDate = this.parseMonthYear(tour.endDate.month, tour.endDate.day, tour.endDate.year);
        
        // Tour is past only if it ended before today (ongoing and future tours are upcoming)
        const dayAfterTourEnds = new Date(tourEndDate);
        dayAfterTourEnds.setDate(dayAfterTourEnds.getDate() + 1);
        
        return {
            ...tour,
            shows: categorizedTourShows,
            actuallyPast: dayAfterTourEnds <= this.today, // Tour is past only after the day after it ends
            tourStartDate: tourStartDate,
            tourEndDate: tourEndDate
        };
    }

    // Create chronologically mixed arrays for past and future
    createChronologicalArrays(categorizedIndividualShows, categorizedTours) {
        const pastItems = [];
        const futureItems = [];

        // Add individual shows to appropriate arrays
        categorizedIndividualShows.forEach(show => {
            const item = { type: 'show', data: show, sortDate: show.showDate };
            if (show.actuallyPast) {
                pastItems.push(item);
            } else {
                futureItems.push(item);
            }
        });

        // Add tours to appropriate arrays, splitting ongoing tours
        categorizedTours.forEach(tour => {
            const pastShows = tour.shows.filter(show => show.actuallyPast);
            const futureShows = tour.shows.filter(show => !show.actuallyPast);
            
            // If tour has both past and future shows, split it
            if (pastShows.length > 0 && futureShows.length > 0) {
                // Add past portion to past items
                const pastTour = {
                    ...tour,
                    shows: pastShows,
                    actuallyPast: true
                };
                pastItems.push({ 
                    type: 'tour', 
                    data: pastTour, 
                    sortDate: tour.tourEndDate 
                });
                
                // Add future portion to future items
                const futureTour = {
                    ...tour,
                    shows: futureShows,
                    actuallyPast: false
                };
                futureItems.push({ 
                    type: 'tour', 
                    data: futureTour, 
                    sortDate: tour.tourStartDate 
                });
            } else {
                // Tour is completely past or future, add as normal
                const sortDate = tour.actuallyPast ? tour.tourEndDate : tour.tourStartDate;
                const item = { type: 'tour', data: tour, sortDate: sortDate };
                if (tour.actuallyPast) {
                    pastItems.push(item);
                } else {
                    futureItems.push(item);
                }
            }
        });

        // Sort chronologically - past shows newest first, future shows oldest first
        pastItems.sort((a, b) => b.sortDate - a.sortDate);
        futureItems.sort((a, b) => a.sortDate - b.sortDate);

        return { pastItems, futureItems };
    }

    // Collect all shows with posters for navigation in chronological order
    collectShowsWithPosters(pastItems, futureItems) {
        const showsWithPosters = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Combine all items and sort chronologically (oldest first)
        const allItems = [...pastItems, ...futureItems].sort((a, b) => a.sortDate - b.sortDate);

        allItems.forEach(item => {
            if (item.type === 'show' && item.data.poster) {
                showsWithPosters.push(item.data);
            } else if (item.type === 'tour') {
                const tour = item.data;

                // Tour poster always comes first, then shows in chronological order
                if (tour.poster) showsWithPosters.push({...tour, isTourPoster: true, tourId: tour.id});

                const tourShowsWithPosters = tour.shows
                    .filter(show => show.poster)
                    .sort((a, b) => {
                        const dateA = a.showDate instanceof Date ? a.showDate.getTime() : new Date(a.showDate).getTime();
                        const dateB = b.showDate instanceof Date ? b.showDate.getTime() : new Date(b.showDate).getTime();
                        return dateA - dateB; // Ascending (oldest first)
                    });

                tourShowsWithPosters.forEach(show => {
                    showsWithPosters.push(show);
                });
            }
        });

        return showsWithPosters;
    }
}

// Create global instance
const showsProcessor = new ShowsProcessor();