const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");
const { authenticateUser } = require("../middleware/auth");

// Debug middleware - log all requests to events API
router.use((req, res, next) => {
    console.log(`[EVENTS API] ${req.method} ${req.path} - Original URL: ${req.originalUrl}`);
    if (req.method === 'POST') {
        console.log(`[EVENTS API] POST request body:`, req.body);
    }
    next();
});

// POST /api/events/create - Create a new event
router.post('/create', authenticateUser, async (req, res) => {
    console.log('=== POST /api/events/create called ===');
    console.log('Request body:', req.body);
    console.log('User from req.user:', req.user);
    
    const { 
        title, 
        description, 
        location, 
        start_time, 
        end_time, 
        attendee_cap, 
        price_cents, 
        restricted_to_org,
        created_by_org_id 
    } = req.body;
    
    // Validation
    if (!title || title.trim() === '') {
        console.log('Validation failed: title is empty');
        return res.status(400).json({
            success: false,
            message: 'Event title is required'
        });
    }
    
    if (!start_time) {
        return res.status(400).json({
            success: false,
            message: 'Start time is required'
        });
    }
    
    if (!end_time) {
        return res.status(400).json({
            success: false,
            message: 'End time is required'
        });
    }
    
    // Validate that end_time is after start_time
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    if (endDate <= startDate) {
        return res.status(400).json({
            success: false,
            message: 'End time must be after start time'
        });
    }
    
    try {
        const user_id = req.user?.id; // Get user ID from authenticated request
        
        console.log('Creating event for user:', user_id);
        console.log('Event title:', title);
        
        if (!user_id) {
            console.error('No user_id found in req.user');
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Prepare event data
        const eventData = {
            created_by_user_id: user_id,
            title: title.trim(),
            start_time: start_time,
            end_time: end_time
        };
        
        // Add optional fields if provided
        if (description) {
            eventData.description = description.trim();
        }
        
        if (location) {
            eventData.location = location.trim();
        }
        
        if (created_by_org_id) {
            eventData.created_by_org_id = parseInt(created_by_org_id);
        }
        
        if (attendee_cap !== undefined && attendee_cap !== null) {
            eventData.attendee_cap = parseInt(attendee_cap);
        }
        
        if (price_cents !== undefined && price_cents !== null) {
            eventData.price_cents = parseInt(price_cents);
        }
        
        if (restricted_to_org !== undefined) {
            eventData.restricted_to_org = Boolean(restricted_to_org);
        }
        
        // Create the event
        const { data: eventDataResult, error: eventError } = await supabase
            .from('events')
            .insert(eventData)
            .select()
            .single();

        if (eventError) {
            console.error('Error creating event:', eventError);
            return res.status(400).json({
                success: false,
                message: 'Failed to create event',
                error: eventError.message
            });
        }

        console.log('Event created successfully:', eventDataResult);

        return res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: eventDataResult
        });
    } catch (err) {
        console.error('Exception in create event:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while creating the event',
            error: err.message
        });
    }
});

// GET /api/events - Get events with optional filters
router.get('/', async (req, res) => {
    try {
        const { org_id, user_id, restricted } = req.query;
        
        let query = supabase
            .from('events')
            .select('*');
        
        // Filter by organization if provided
        if (org_id) {
            query = query.eq('created_by_org_id', parseInt(org_id));
        }
        
        // Filter by user if provided
        if (user_id) {
            query = query.eq('created_by_user_id', user_id);
        }
        
        // Filter by restricted status if provided
        if (restricted !== undefined) {
            query = query.eq('restricted_to_org', restricted === 'true');
        }
        
        // Order by start_time ascending (upcoming events first)
        query = query.order('start_time', { ascending: true });
        
        const { data, error } = await query;

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch events',
                error: error.message
            });
        }

        return res.json({
            success: true,
            events: data || []
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching events',
            error: err.message
        });
    }
});

// GET /api/events/:id - Get a specific event by event_id
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('event_id', id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Event not found',
                error: error.message
            });
        }

        return res.json({
            success: true,
            event: data
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the event',
            error: err.message
        });
    }
});

// PUT /api/events/:id - Update an event
router.put('/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }
    
    try {
        // First, check if the event exists and user has permission
        const { data: existingEvent, error: fetchError } = await supabase
            .from('events')
            .select('*')
            .eq('event_id', id)
            .single();
        
        if (fetchError || !existingEvent) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Check if user is the creator
        if (existingEvent.created_by_user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this event'
            });
        }
        
        // Prepare update data
        const updateData = {};
        const { 
            title, 
            description, 
            location, 
            start_time, 
            end_time, 
            attendee_cap, 
            price_cents, 
            restricted_to_org 
        } = req.body;
        
        if (title !== undefined) {
            if (title.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Event title cannot be empty'
                });
            }
            updateData.title = title.trim();
        }
        
        if (description !== undefined) {
            updateData.description = description ? description.trim() : null;
        }
        
        if (location !== undefined) {
            updateData.location = location ? location.trim() : null;
        }
        
        if (start_time !== undefined) {
            updateData.start_time = start_time;
        }
        
        if (end_time !== undefined) {
            updateData.end_time = end_time;
        }
        
        // Validate that end_time is after start_time if both are being updated
        if (updateData.start_time && updateData.end_time) {
            const startDate = new Date(updateData.start_time);
            const endDate = new Date(updateData.end_time);
            if (endDate <= startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }
        } else if (updateData.start_time && existingEvent.end_time) {
            const startDate = new Date(updateData.start_time);
            const endDate = new Date(existingEvent.end_time);
            if (endDate <= startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }
        } else if (updateData.end_time && existingEvent.start_time) {
            const startDate = new Date(existingEvent.start_time);
            const endDate = new Date(updateData.end_time);
            if (endDate <= startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }
        }
        
        if (attendee_cap !== undefined) {
            updateData.attendee_cap = attendee_cap ? parseInt(attendee_cap) : null;
        }
        
        if (price_cents !== undefined) {
            updateData.price_cents = price_cents ? parseInt(price_cents) : null;
        }
        
        if (restricted_to_org !== undefined) {
            updateData.restricted_to_org = Boolean(restricted_to_org);
        }
        
        // Update the event
        const { data: updatedEvent, error: updateError } = await supabase
            .from('events')
            .update(updateData)
            .eq('event_id', id)
            .select()
            .single();
        
        if (updateError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update event',
                error: updateError.message
            });
        }
        
        return res.json({
            success: true,
            message: 'Event updated successfully',
            event: updatedEvent
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the event',
            error: err.message
        });
    }
});

// DELETE /api/events/:id - Delete an event
router.delete('/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }
    
    try {
        // First, check if the event exists and user has permission
        const { data: existingEvent, error: fetchError } = await supabase
            .from('events')
            .select('created_by_user_id')
            .eq('event_id', id)
            .single();
        
        if (fetchError || !existingEvent) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Check if user is the creator
        if (existingEvent.created_by_user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this event'
            });
        }
        
        // Delete the event
        const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .eq('event_id', id);
        
        if (deleteError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to delete event',
                error: deleteError.message
            });
        }
        
        return res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the event',
            error: err.message
        });
    }
});

module.exports = router;

